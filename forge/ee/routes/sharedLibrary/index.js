module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, response) => {
        // The request has a valid token, but need to check the token is allowed
        // to access the library

        // For initial shared library implementation, this will be the teamId
        const id = request.params.libraryId
        const team = await app.db.models.Team.byId(id)
        if (team) {
            request.team = team
            // Check this feature is enabled for this team type.
            if (team.TeamType.getFeatureProperty('shared-library', true)) {
                // If this is a session token, verify the project or device is in the team
                if (request.session.ownerType === 'project') {
                    const project = await app.db.models.Project.byId(request.session.ownerId)
                    if (project.Team.hashid === id) {
                        // Project exists and the auth token is for this team
                        return
                    }
                } else if (request.session.ownerType === 'device') {
                    const deviceId = +request.session.ownerId
                    const device = await app.db.models.Device.byId(deviceId)
                    if (device?.Team.hashid === id) {
                        // Device exists and the auth token is for this team
                        return
                    }
                } else if (!request.session.ownerType) {
                    // This is a logged-in user. Get their teamMembership so the needsPermission
                    // checks in the routes will evaluate properly
                    request.teamMembership = await request.session.User.getTeamMembership(request.team.id)
                    if (request.teamMembership) {
                        return
                    }
                }
            }
        }
        response.status(404).send({ code: 'not_found', error: 'Not Found' })
    })

    app.post('/storage/library/:libraryId/*', {
        preHandler: async (request, reply) => {
            return app.needsPermission('library:entry:create')(request, reply)
        }
    }, async (request, response) => {
        const type = request.body.type
        let body = request.body.body
        const name = request.params['*']
        const meta = request.body.meta

        if (!type) {
            response.code(400).send({ code: 'invalid_request', error: 'Missing type parameter' })
            return
        }

        if (typeof body === 'object') {
            body = JSON.stringify(body)
        }

        const direct = await app.db.models.StorageSharedLibrary.byName(request.team.id, type, name)

        if (direct) {
            // Updating an existing entry
            direct.body = body
            direct.meta = JSON.stringify(meta)
            await direct.save()
        } else {
            // Adding a new entry. We need to check each part of the path to ensure
            // none are existing 'files' - otherwise we could end up with a directory
            // with a file and subdirectory with the same name, making it untraversable
            const parts = name.split('/')
            for (let i = 0; i < parts.length - 1; i++) {
                const subpath = parts.slice(0, i + 1).join('/')
                const count = await app.db.models.StorageSharedLibrary.count({
                    where: {
                        name: subpath,
                        TeamId: request.team.id
                    }
                })
                if (count > 0) {
                    response.status(400).send({ code: 'invalid_name', error: 'Invalid entry name' })
                    return
                }
            }

            // Finally, need to check the new entries full path isn't actually
            // an existing path.
            const existing = await app.db.models.StorageSharedLibrary.byPath(request.team.id, null, name + '/')
            if (existing.length > 0) {
                response.status(400).send({ code: 'invalid_name', error: 'Invalid entry name' })
                return
            }

            await app.db.models.StorageSharedLibrary.create({
                name,
                type,
                meta: JSON.stringify(meta),
                body,
                TeamId: request.team.id
            })
        }

        response.status(201).send()
    })

    app.get('/storage/library/:libraryId/*', {
        preHandler: async (request, reply) => {
            return app.needsPermission('library:entry:list')(request, reply)
        }
    }, async (request, response) => {
        const type = request.query.type
        let name = request.params['*']

        let reply = []

        // Try to get the exact name
        const direct = await app.db.models.StorageSharedLibrary.byName(request.team.id, type, name)
        if (direct) {
            if (direct.type === 'flows') {
                reply = JSON.parse(direct.body)
            } else {
                reply = direct.body
            }
        } else {
            // No entry with that exact name. Check to see if its a partial
            // path name
            if (name.length > 0 && name[name.length - 1] !== '/') {
                name += '/'
            }
            const subPaths = new Set()
            const entries = await app.db.models.StorageSharedLibrary.byPath(request.team.id, type, name)
            entries.forEach(entry => {
                const shortName = entry.name.substring(name.length)
                const pathParts = shortName.split('/')
                if (pathParts.length === 1) {
                    reply.push({ fn: shortName, ...JSON.parse(entry.meta), type: entry.type, updatedAt: entry.updatedAt })
                } else {
                    subPaths.add(pathParts[0])
                }
            })
            reply.push(...subPaths)
        }

        // add meta info to headers
        response.header('x-meta-type', direct ? direct.type : 'folder')

        response.send(reply)
    })

    app.delete('/storage/library/:libraryId/*', {
        preHandler: async (request, reply) => {
            if (request.teamMembership) {
                return app.needsPermission('library:entry:delete')(request, reply)
            }
        }
    }, async (request, response) => {
        const type = request.query.type
        let name = request.params['*']

        let deleteCount = 0
        // Try to get the exact name
        const direct = await app.db.models.StorageSharedLibrary.byName(request.team.id, type, name)
        if (direct) {
            await direct.destroy()
            deleteCount++
        } else {
            // No entry with that exact name. Check to see if its a partial
            // path name
            if (name.length > 0 && name[name.length - 1] !== '/') {
                name += '/'
            }
            const entries = await app.db.models.StorageSharedLibrary.byPath(request.team.id, type, name)
            for (const entry of entries) {
                await entry.destroy()
                deleteCount++
            }
        }
        if (deleteCount === 0) {
            response.status(404).send({ code: 'not_found', error: 'Not Found' })
        } else {
            response.send({ status: 'okay', deleteCount })
        }
    })
}
