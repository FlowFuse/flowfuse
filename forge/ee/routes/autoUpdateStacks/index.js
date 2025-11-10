const { KEY_STACK_UPGRADE_HOUR } = require('../../../db/models/ProjectSettings')

module.exports = async function (app) {
    app.config.features.register('autoStackUpdate', true, true)

    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.projectId) {
            try {
                request.project = await app.db.models.Project.byId(request.params.projectId)
                if (!request.project) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    return
                }
                if (request.session.User) {
                    request.teamMembership = await request.session.User.getTeamMembership(request.project.Team.id)
                    if (!request.teamMembership && !request.session.User.admin) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return // eslint-disable-line no-useless-return
                    }
                } else if (request.session.ownerId !== request.params.projectId) {
                    // AccessToken being used - but not owned by this project
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    return // eslint-disable-line no-useless-return
                }
            } catch (err) {

            }
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    /**
     * Get Instance Restart Time
     * @name /apu/v1/projects/:id/autoUpdateStack
     * @memberof forge.routes.api.project
     */
    app.get('/', {
        preHandler: app.needsPermission('project:edit'),
        schema: {
            summary: 'Returns when a Instance allowed to be restarted ',
            tags: ['Instances'],
            params: {
                type: 'object',
                properties: {
                    projectId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        hour: { type: 'number' },
                        day: { type: 'number' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const schedule = await request.project.getSetting(KEY_STACK_UPGRADE_HOUR)
        if (schedule) {
            reply.send(schedule)
            return
        }
        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
    })

    /**
     * Set Instance Restart Time
     * @name /apu/v1/projects/:id/autoUpdateStack
     * @memberof forge.routes.api.project
     */
    app.put('/', {
        preHandler: app.needsPermission('project:edit'),
        schema: {
            summary: 'Sets when an Instance can be restarted',
            tags: ['Instances'],
            params: {
                type: 'object',
                properties: {
                    projectId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    schedule: {
                        type: 'object',
                        properties: {
                            hour: { type: 'number' },
                            day: { type: 'number' }
                        }
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        hour: { type: 'number' },
                        day: { type: 'number' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        if (request.body.schedule) {
            try {
                await request.project.updateSetting(KEY_STACK_UPGRADE_HOUR, request.body.schedule)
                reply.send(request.body.schedule)
            } catch (err) {
                return reply
                    .code(err.statusCode || 400)
                    .send({
                        code: err.code || 'unexpected_error',
                        error: err.error || err.message
                    })
            }
        }
    })

    /**
     * Clear Instance Restart Time
     * @name /apu/v1/projects/:id/autoUpdateStack
     * @memberof forge.routes.api.project
     */
    app.delete('/', {
        preHandler: app.needsPermission('project:edit'),
        schema: {
            summary: 'Clears when an Instance can be restarted',
            tags: ['Instances'],
            params: {
                type: 'object',
                properties: {
                    projectId: { type: 'string' }
                }
            },
            response: {
                200: {},
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            await request.project.removeSetting(KEY_STACK_UPGRADE_HOUR)
            reply.code(201).send()
        } catch (err) {
            return reply
                .code(err.statusCode || 400)
                .send({
                    code: err.code || 'unexpected_error',
                    error: err.error || err.message
                })
        }
    })
}
