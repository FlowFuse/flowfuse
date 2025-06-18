module.exports = async function (app) {
    // All routes are relative to /api/v1/teams/:teamId/tables

    app.addHook('preHandler', async (request, reply) => {
        if (request.params.teamId !== undefined) {
            if (!request.team) {
                request.team = await app.db.models.Team.byId(request.params.teamId)
                if (!request.team) {
                    return reply.status(404).send({ error: 'Team not found' })
                }
            }
        }
        if (!request.teamMembership) {
            request.teamMembership = await request.session.User.getTeamMembership(request.team.id)
        }
    })

    app.get('/', {
        preHandler: app.needsPermission('team:database:list'),
        schema: {
            summary: '',
            tags: ['FF tables'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        host: { type: 'string' },
                        port: { type: 'number' },
                        ssl: { type: 'boolean' },
                        database: { type: 'string' },
                        user: { type: 'string' },
                        password: { type: 'string' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const creds = await app.tables.getDatabase(request.team)
        if (!creds) {
            return reply.status(404).send({ error: 'Database not found' })
        }
        reply.send(creds)
    })
    /**
     * @name /api/v1/teams/:teamId/tables
     * @description Create a new database for the team
     * @static
     * @memberof forge.routes.api.team.tables
     */
    app.post('/', {
        preHandler: app.needsPermission('team:database:create'),
        schema: {
            summary: '',
            tags: ['FF tables'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        host: { type: 'string' },
                        port: { type: 'number' },
                        ssl: { type: 'boolean' },
                        database: { type: 'string' },
                        user: { type: 'string' },
                        password: { type: 'string' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            const creds = await app.tables.createDatabase(request.team)
            reply.send(creds)
        } catch (err) {
            if (err.message.includes('already exists')) {
                return reply.status(409).send({ error: 'Database already exists' })
            } else {
                console.log(err)
                reply.status(500).send({ error: 'Failed to create database' })
            }
        }
    })

    app.delete('/', {
        preHandler: app.needsPermission('team:database:delete'),
        schema: {
            summary: '',
            tags: ['FF tables'],
            response: {
                200: {},
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            await app.tables.destroyDatabase(request.team)
            reply.send({})
        } catch (err) {
            reply.status(500).send({ error: 'Failed to destroy database' })
        }
    })
}
