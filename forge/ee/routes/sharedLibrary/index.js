module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, response) => {
        // The request has a valid token, but need to check the token is allowed
        // to access the project

        const id = request.params.projectId
        // Check if the project exists first
        const project = await app.db.models.Project.byId(id)
        if (project && request.session.ownerType === 'project' && request.session.ownerId === id) {
            request.project = project
            // Project exists and the auth token is for this project
            return
        }
        response.status(404).send({ code: 'not_found', error: 'Not Found' })
    })

    app.post('/:projectId/shared-library/:libraryId/:type',
        {
            schema: {
                body: {
                    type: 'object',
                    required: ['name', 'body'],
                    properties: {
                        name: { type: 'string' },
                        meta: { type: 'object' },
                        body: {
                            anyOf: [
                                { type: 'string' },
                                { type: 'object' }
                            ]
                        }
                    }
                },
                params: {
                    // type: { type: 'string', enum: [ 'flows', 'functions', 'templates' ] },
                    id: { type: 'string' }
                }
            }
        },
        async (request, response) => {
            const id = request.params.libraryId
            const type = request.params.type
            let body = request.body.body
            const name = request.body.name
            const meta = request.body.meta

            if (id !== request.project.Team.hashid) {
                response.status(404).send({ code: 'not_found', error: 'Not Found' })
                return
            }

            if (typeof body === 'object') {
                body = JSON.stringify(body)
            }

            const direct = await app.db.models.StorageSharedLibrary.byName(request.project.Team.id, type, name)

            if (direct) {
                direct.body = body
                direct.meta = JSON.stringify(meta)
                await direct.save()
            } else {
                await app.db.models.StorageSharedLibrary.create({
                    name: request.body.name,
                    type,
                    meta: JSON.stringify(meta),
                    body,
                    TeamId: request.project.Team.id
                })
            }

            response.status(201).send()
        }
    )

    app.get('/:projectId/shared-library/:libraryId/:type',
        {
            schema: {
                query: {
                    name: { type: 'string' }
                },
                params: {
                    // type: { type: 'string', enum: [ 'flows', 'functions', 'templates' ]},
                    id: { type: 'string' }
                }
            }
        },
        async (request, response) => {
            const id = request.params.libraryId
            const type = request.params.type
            let name = request.query.name

            // For now, we only have a single shared library - the default team library
            // It's id is the hashid of the team. We need to verify that is proper here
            // and then translate it to the real team id.

            if (id !== request.project.Team.hashid) {
                response.status(404).send({ code: 'not_found', error: 'Not Found' })
                return
            }

            let reply = []

            // Try to get the exact name
            const direct = await app.db.models.StorageSharedLibrary.byName(request.project.Team.id, type, name)
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
                const entries = await app.db.models.StorageSharedLibrary.byPath(request.project.Team.id, type, name)
                entries.forEach(entry => {
                    const shortName = entry.name.substring(name.length)
                    const pathParts = shortName.split('/')
                    if (pathParts.length === 1) {
                        reply.push({ fn: shortName, ...JSON.parse(entry.meta) })
                    } else {
                        subPaths.add(pathParts[0])
                    }
                })
                reply.push(...subPaths)
            }
            response.send(reply)
        }
    )
}
