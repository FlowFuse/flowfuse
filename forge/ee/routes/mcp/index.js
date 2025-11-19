module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.teamId !== undefined || request.params.teamSlug !== undefined) {
            if (!request.team) {
                // For a :teamId route, we can now lookup the full team object
                request.team = await app.db.models.Team.byId(request.params.teamId)
                if (!request.team) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            }
        }
    })

    /**
     * Get the MCP servers for a team
     * @name /api/v1/teams/:teamId/mcp
     * @static
     * @memberof forge.routes.api.team.mcp
     */
    app.get('/', {
        preHandler: app.needsPermission('team:mcp:list'),
        schema: {
            summary: '',
            tags: ['MCP'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'array'
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
            const mcpServers = await app.db.models.MCPRegistration.byTeam(request.params.teamId)
            reply.send(mcpServers)
        } catch (err) {
            reply.status(500).send({ code: 'unexpected_error', error: 'Failed to find mcp entries for team' })
        }
    })

    app.post('/:type/:id', {
        preHandler: async (request, reply) => {
            if (request.session.ownerType === 'project' || request.session.ownerType === 'device') {
                // all good
            } else {
                reply.code(403).send({ code: 'unauthorized', error: 'Unauthorized' })
            }
        },
        schema: {
            summary: '',
            tags: ['MCP'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    type: { type: 'string' },
                    id: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    endpointRoute: { type: 'string' },
                    protocol: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            await app.db.models.MCPRegistration.upsert({
                targetType: request.params.type,
                targetId: request.params.id,
                ...request.body,
                TeamId: request.team.id
            }, {
                fields: ['name', 'endpointRoute'],
                conflictFields: ['TeamId', 'targetType', 'targetId']
            })
        } catch (err) {
            app.log.error(`register MCP Server ${err.toString()}`)
            reply.status(500).send({ code: 'unexpected_error', error: 'Failed to create mcp entry' })
            return
        }
        reply.send({})
    })

    app.delete('/:type/:id', {
        preHandler: async (request, reply) => {
            if (request.session.ownerType === 'project' || request.session.ownerType === 'device') {
                // all good
            } else {
                reply.code(403).send({ code: 'unauthorized', error: 'Unauthorized' })
            }
        },
        schema: {
            summary: '',
            tags: ['MCP'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    type: { type: 'string' },
                    id: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object'
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
            const mcpServer = await app.db.models.MCPRegistration.byTypeAndID(request.params.type, request.params.id)
            if (mcpServer) {
                await mcpServer.destroy()
                reply.send({})
            } else {
                reply.status(404).send({ code: 'not_found', error: 'MCP server not found' })
            }
        } catch (err) {
            app.log.error(`delete MCP Server ${err.toString()}`)
            reply.status(500).send({ code: 'unexpected_error', error: 'Failed to delete mcp entry' })
        }
    })
}
