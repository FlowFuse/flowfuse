const { registerPermissions } = require('../../../lib/permissions')
const { Roles } = require('../../../lib/roles.js')

module.exports = async function (app) {
    registerPermissions({
        'library:entry:create': { description: 'Create entries in a team library', role: Roles.Member },
        'library:entry:list': { description: 'List entries in a team library', role: Roles.Member }
    })

    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, response) => {
        // The request has a valid token, but need to check the token is allowed
        // to access the library

        // For initial shared library implementation, this will be the teamId
        const id = request.params.libraryId
        const team = await app.db.models.Team.byId(id)
        if (team) {
            request.team = team
            // If this is a project session token, verify the project is in the team
            if (request.session.ownerType === 'project') {
                const project = await app.db.models.Project.byId(request.session.ownerId)
                if (project.Team.hashid === id) {
                    // Project exists and the auth token is for this project
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
        response.status(404).send({ code: 'not_found', error: 'Not Found' })
    })

    app.post('/storage/library/:libraryId/*', {
        preHandler: async (request, reply) => {
            if (request.teamMembership) {
                return app.needsPermission('library:entry:create')(request, reply)
            }
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
            direct.body = body
            direct.meta = JSON.stringify(meta)
            await direct.save()
        } else {
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
            if (request.teamMembership) {
                return app.needsPermission('library:entry:list')(request, reply)
            }
        }
    }, async (request, response) => {
        const type = request.query.type
        let name = request.params['*']

        // For now, we only have a single shared library - the default team library
        // It's id is the hashid of the team. We need to verify that is proper here
        // and then translate it to the real team id.
        let reply = []

        // Try to get the exact name
        const direct = await app.db.models.StorageSharedLibrary.byName(request.team.id, type, name)
        if (direct) {
            if (type === 'flows') {
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
                    reply.push({ fn: shortName, ...JSON.parse(entry.meta), type: entry.type })
                } else {
                    subPaths.add(pathParts[0])
                }
            })
            reply.push(...subPaths)
        }
        response.send(reply)
    })
}
