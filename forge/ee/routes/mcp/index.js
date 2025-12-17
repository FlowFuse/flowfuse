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
        if (request.session.User) {
            request.sessionUser = true
            request.instanceTokenReq = false
            if (!request.teamMembership) {
                request.teamMembership = await request.session.User.getTeamMembership(request.team.id)
            }
        } else if (request.session.ownerType === 'project' || request.session.ownerType === 'device') {
            // this is a request from a project or device
            request.sessionUserReq = false
            request.instanceTokenReq = true
        } else {
            reply.code(403).send({ code: 'unauthorized', error: 'Unauthorized' })
            throw new Error('Unauthorized')
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
                    type: 'object',
                    properties: {
                        count: { type: 'number' },
                        servers: { $ref: 'MCPRegistrationSummaryList' }
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
            const mcpServers = await app.db.models.MCPRegistration.byTeam(request.params.teamId)
            const mcpServersView = app.db.views.MCPRegistrations.MCPRegistrationSummaryList(mcpServers)
            reply.send({ count: mcpServers.length, servers: mcpServersView })
        } catch (err) {
            reply.status(500).send({ code: 'unexpected_error', error: 'Failed to find mcp entries for team' })
        }
    })

    app.post('/:type/:typeId/:nodeId', {
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
                    typeId: { type: 'string' },
                    nodeId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    endpointRoute: { type: 'string' },
                    protocol: { type: 'string' },
                    title: { type: 'string' },
                    version: { type: 'string' },
                    description: { type: 'string' }
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
                targetId: request.params.typeId,
                nodeId: request.params.nodeId,
                mcpName: request.body.mcpName,
                title: request.body.title,
                version: request.body.version,
                description: request.body.description,
                name: request.body.name,
                endpointRoute: request.body.endpointRoute,
                protocol: request.body.protocol,
                TeamId: request.team.id
            }, {
                fields: ['name', 'endpointRoute', 'title', 'version', 'description'],
                conflictFields: ['TeamId', 'targetType', 'nodeId', 'targetId']
            })
        } catch (err) {
            app.log.error(`register MCP Server ${err.toString()}`)
            reply.status(500).send({ code: 'unexpected_error', error: 'Failed to create mcp entry' })
            return
        }
        reply.send({})
    })

    app.delete('/:type/:typeId/:nodeId', {
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
                    typeId: { type: 'string' },
                    nodeId: { type: 'string' }
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
            const mcpServer = await app.db.models.MCPRegistration.byTypeAndIDs(request.params.type, request.params.typeId, request.params.nodeId)
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
