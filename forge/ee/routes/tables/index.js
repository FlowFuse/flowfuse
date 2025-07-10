const { name } = require('../../db/models/Table')

module.exports = async function (app) {
    // All routes are relative to /api/v1/teams/:teamId/databases

    app.addHook('preHandler', async (request, reply) => {
        if (request.params.teamId !== undefined) {
            if (!request.team) {
                request.team = await app.db.models.Team.byId(request.params.teamId)
                if (!request.team) {
                    return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
                }
            }
            const teamType = await request.team.getTeamType()
            if (!teamType.getFeatureProperty('tables', false)) {
                reply.code(404).send({ code: 'not_found', error: 'Not Found - not available on team' })
                return // eslint-disable-line no-useless-return
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
                    type: 'array',
                    items: { $ref: 'DatabaseCredentials' }
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
        const creds = await app.tables.getDatabases(request.team)
        if (!creds) {
            return reply.send([])
        }
        reply.send(await app.db.views.Table.tables(creds))
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
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Name of the database' }
                },
                required: ['name']
            },
            response: {
                200: {
                    type: 'object',
                    $ref: 'DatabaseCredentials'
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
            const creds = await app.tables.createDatabase(request.team, request.body.name)
            reply.send(await app.db.views.Table.table(creds))
        } catch (err) {
            if (err.message.includes('already exists')) {
                return reply.status(409).send({ code: 'already_exists', error: 'Database already exists' })
            } else {
                console.log(err)
                reply.status(500).send({ code: 'unexpected_error', error: 'Failed to create database' })
            }
        }
    })

    app.get('/:databaseId', {
        preHandler: app.needsPermission('team:database:list'),
        schema: {
            summary: '',
            tags: ['FF tables'],
            params: {
                type: 'object',
                properties: {
                    databaseId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    $ref: 'DatabaseCredentials'
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
            const creds = await app.tables.getDatabase(request.team.hashid, request.params.databaseId)
            if (creds) {
                reply.send(await app.db.views.Table.table(creds))
            } else {
                reply.status(404).send({ code: 'not_found', error: 'Database not found' })
            }
        } catch (err) {
            console.log(err)
            reply.status(500).send({ code: 'unexpected_error', error: 'Failed to retrieve database' })
        }
    })

    app.delete('/:databaseId', {
        preHandler: app.needsPermission('team:database:delete'),
        schema: {
            summary: '',
            tags: ['FF tables'],
            params: {
                type: 'object',
                properties: {
                    databaseId: { type: 'string' }
                }
            },
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
            await app.tables.destroyDatabase(request.team, request.params.databaseId)
            reply.send({})
        } catch (err) {
            reply.status(500).send({ code: 'unexpected_error', error: 'Failed to destroy database' })
        }
    })

    app.get('/:databaseId/tables', {
        preHandler: app.needsPermission('team:database:list'),
        schema: {
            summary: '',
            tags: ['FF tables'],
            params: {
                type: 'object',
                properties: {
                    databaseId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            schema: { type: 'string' }
                        }
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
        // paginate the list of tables
        const tables = await app.tables.getTables(request.team, request.params.databaseId)
        if (!tables) {
            return reply.status(404).send({ code: 'not_found', error: 'Database not found' })
        }
        reply.send(tables)
    })

    app.get('/:databaseId/tables/:tableName', {
        preHandler: app.needsPermission('team:database:list'),
        schema: {
            summary: '',
            tags: ['FF tables'],
            params: {
                type: 'object',
                properties: {
                    databaseId: { type: 'string' },
                    tableName: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'DatabaseTable'
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
        // get the table schema
        const table = await app.tables.getTable(request.team, request.params.databaseId, request.params.tableName)
        if (!table) {
            return reply.status(404).send({ error: 'Table not found' })
        }
        reply.send(table)
    })

    app.get('/:databaseId/tables/:tableName/data', {
        preHandler: app.needsPermission('team:database:list'),
        schema: {
            summary: '',
            tags: ['FF tables'],
            params: {
                type: 'object',
                properties: {
                    databaseId: { type: 'string' },
                    tableName: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: true // allow any properties in the table rows
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
        // paginate the data in the table
        const data = await app.tables.getTableData(request.team, request.params.databaseId, request.params.tableName)
        reply.send(data)
    })
}
