const projectShared = require('../../../routes/api/shared/project.js')

module.exports = async function (app) {
    app.config.features.register('instanceResources', true, true)

    app.addHook('preHandler', projectShared.defaultPreHandler.bind(null, app))

    app.addHook('preHandler', async (request, reply) => {
        if (!request.project) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }
        const teamType = await request.project.Team.getTeamType()
        if (!teamType.getFeatureProperty('instanceResources', false)) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return // eslint-disable-line no-useless-return
        }
    })

    /**
     *
     * @name /api/v1/projects/:id/resources
     * @memberof forge.routes.api.project
     */
    app.get('/', {
        preHandler: app.needsPermission('project:read'),
        schema: {
            summary: 'Returns resource usage history for an Instance',
            tags: ['Instances'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        resources: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    src: { type: 'string' },
                                    ps: { type: 'number' },
                                    cpu: { type: 'number' },
                                    hs: { type: 'number' },
                                    hu: { type: 'number' },
                                    ts: { type: 'number' }
                                }
                            }
                        },
                        count: { type: 'number' }
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
            const resources = await app.containers.resources(request.project)
            reply.send(resources)
        } catch (err) {
            reply.code(500).send({ code: 'unknown_error', error: 'unknown error' })
        }
    })

    app.get('/stream', {
        preHandler: app.needsPermission('project:read'),
        websocket: true
    }, async (socket, request) => {
        await app.containers.resourcesStream(request.project, socket.socket)
    })
}
