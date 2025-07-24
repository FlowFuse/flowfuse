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

    /**
     * @name /api/v1/teams/:teamId/databases
     * @description List all databases for the team
     * @static
     * @memberof forge.routes.api.team.tables
     */
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
     * @name /api/v1/teams/:teamId/databases
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
            const creds = await app.tables.createDatabase(request.team, request.body?.name ? request.body.name : request.team.hashid)
            reply.send(await app.db.views.Table.table(creds))
        } catch (err) {
            if (err.message.includes('already exists')) {
                return reply.status(409).send({ code: 'already_exists', error: 'Database already exists' })
            } else {
                // console.log(err)
                reply.status(500).send({ code: 'unexpected_error', error: 'Failed to create database' })
            }
        }
    })

    /**
     * @name /api/v1/teams/:teamId/databases/:databaseId
     * @description Get a specific team database by ID
     * @static
     * @memberof forge.routes.api.team.tables
     */
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
            const creds = await app.tables.getDatabase(request.team, request.params.databaseId)
            if (creds) {
                reply.send(await app.db.views.Table.table(creds))
            } else {
                reply.status(404).send({ code: 'not_found', error: 'Database not found' })
            }
        } catch (err) {
            // console.log(err)
            reply.status(500).send({ code: 'unexpected_error', error: 'Failed to retrieve database' })
        }
    })

    /**
     * @name /api/v1/teams/:teamId/databases/:databaseId
     * @description Delete a specific team database by ID
     * @static
     * @memberof forge.routes.api.team.tables
     */
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
            // console.log(err)
            reply.status(500).send({ code: 'unexpected_error', error: 'Failed to destroy database' })
        }
    })

    /**
     * @name /api/v1/teams/:teamId/databases/:databaseId/tables
     * @description List all tables in a specific team database
     * @static
     * @memberof forge.routes.api.team.tables
     */
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

    /**
     * @name /api/v1/teams/:teamId/databases/:databaseId/tables
     * @description Creates new table in database
     * @static
     * @memberof forge.routes.api.team.tables
     */
    app.post('/:databaseId/tables', {
        preHandler: app.needsPermission('team:database:create'),
        schema: {
            summary: '',
            tags: ['FF tables'],
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    columns: { $ref: 'DatabaseTable' }
                }
            },
            params: {
                type: 'object',
                properties: {
                    databaseId: { type: 'string' }
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
        if (request.body.name && request.body.columns) {
            const tables = await app.tables.getTables(request.team, request.params.databaseId)
            if (tables.filter((t) => t.name === request.body.name).length === 1) {
                reply.status(409).send({ code: 'table_exists', error: 'Table already exists' })
            } else {
                const t = await app.tables.createTable(request.team, request.params.databaseId, request.body.name, request.body.columns)
                reply.status(201).send(t)
            }
        }
    })

    /**
     * @name /api/v1/teams/:teamId/databases/:databaseId/tables/:tableName
     * @description Get a specific table schema in a team database
     * @static
     * @memberof forge.routes.api.team.tables
     */
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
            return reply.status(404).send({ code: 'table_not_found', error: 'Table not found' })
        }
        reply.send(table)
    })

    /**
     * @name /api/v1/teams/:teamId/databases/:databaseId/tables/:tableName
     * @description Delete a specific table schema in a team database
     * @static
     * @memberof forge.routes.api.team.tables
     */
    app.delete('/:databaseId/tables/:tableName', {
        preHandler: app.needsPermission('team:database:create'),
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
        const tables = await app.tables.getTables(request.team, request.params.databaseId)
        if (tables.filter((t) => t.name === request.params.tableName).length === 1) {
            await app.tables.dropTable(request.team, request.params.databaseId, request.params.tableName)
            reply.status(204).send()
        } else {
            reply.status(404).send({ code: 'table_not_found', error: 'Table not found' })
        }
    })

    /**
     * @name /api/v1/teams/:teamId/databases/:databaseId/tables/:tableName/data
     * @description Get sample data from a specific table in a team database
     * @static
     * @memberof forge.routes.api.team.tables
     */
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
