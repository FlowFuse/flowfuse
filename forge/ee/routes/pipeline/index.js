const { ValidationError } = require('sequelize')

const { KEY_PROTECTED } = require('../../../db/models/ProjectSettings.js')
const { ControllerError } = require('../../../lib/errors.js')
const { registerPermissions } = require('../../../lib/permissions')
const { Roles } = require('../../../lib/roles.js')

// Declare getLogger functions to provide type hints / quick code nav / code completion
/** @type {import('../../../../forge/auditLog/team').getLoggers} */
const getTeamLogger = (app) => { return app.auditLog.Team }

module.exports = async function (app) {
    const teamLogger = getTeamLogger(app)

    registerPermissions({
        'pipeline:read': { description: 'View a pipeline', role: Roles.Member },
        'pipeline:create': { description: 'Create a pipeline', role: Roles.Owner },
        'pipeline:edit': { description: 'Edit a pipeline', role: Roles.Owner },
        'pipeline:delete': { description: 'Delete a pipeline', role: Roles.Owner },
        'application:pipeline:list': { description: 'List pipelines within an application', role: Roles.Member }
    })

    app.addHook('preHandler', async (request, reply) => {
        if (request.params.pipelineId) {
            const pipelineId = request.params.pipelineId
            request.pipeline = await app.db.models.Pipeline.byId(pipelineId)
            if (!request.pipeline) {
                return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
        if (request.params.applicationId || request.body?.applicationId) {
            const applicationId = request.params.applicationId || request.body?.applicationId
            request.application = await app.db.models.Application.byId(applicationId)
            if (!request.application) {
                return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
            if (request.pipeline && request.pipeline.ApplicationId !== request.application.id) {
                return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        } else if (request.pipeline) {
            request.application = await app.db.models.Application.byId(request.pipeline.ApplicationId)
        } else {
            return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }

        if (request.session.User) {
            request.teamMembership = await request.session.User.getTeamMembership(request.application.Team.id)
            if (!request.teamMembership && !request.session.User.admin) {
                return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        } else {
            return reply.code(401).send({ code: 'unauthorized', error: 'Unauthorized' })
        }
    })

    /**
     * Create a new Pipeline
     * /api/v1/pipelines
     */
    app.post('/pipelines', {
        preHandler: app.needsPermission('pipeline:create'),
        schema: {
            summary: 'Create a new pipeline within an application',
            tags: ['Pipelines'],
            body: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' },
                    name: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'Pipeline'
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
        const team = await request.teamMembership.getTeam()
        const name = request.body.name?.trim()

        let pipeline
        try {
            pipeline = await app.db.models.Pipeline.create({
                name,
                ApplicationId: request.application.id
            })
        } catch (error) {
            if (handleValidationError(error, reply)) {
                return
            }

            app.log.error('Error while creating pipeline:')
            app.log.error(error)

            return reply.code(500).send({ code: 'unexpected_error', error: error.toString() })
        }

        await app.auditLog.Team.application.pipeline.created(request.session.User, null, team, request.application, pipeline)

        reply.send(await app.db.views.Pipeline.pipeline(pipeline))
    })

    /**
     * Delete a Pipeline
     * /api/v1/pipelines/:id
     */
    app.delete('/pipelines/:pipelineId', {
        preHandler: app.needsPermission('pipeline:delete'),
        schema: {
            summary: 'Delete a pipeline',
            tags: ['Pipelines'],
            params: {
                type: 'object',
                properties: {
                    pipelineId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const team = await request.teamMembership.getTeam()
        const pipeline = request.pipeline

        const stages = await pipeline.stages()
        if (stages.length > 0) {
        // delete stages too
            for (let i = 0; i < stages.length; i++) {
                stages[i].destroy()
            }
        }

        await pipeline.destroy()
        await app.auditLog.Team.application.pipeline.deleted(request.session.User, null, team, request.application, pipeline)

        reply.send({ status: 'okay' })
    })

    /**
     * Update a Pipeline
     * /api/v1/pipelines/:id
     */
    app.put('/pipelines/:pipelineId', {
        preHandler: app.needsPermission('pipeline:edit'),
        schema: {
            summary: 'Update a pipeline within an application',
            tags: ['Pipelines'],
            params: {
                type: 'object',
                properties: {
                    pipelineId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'Pipeline'
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
        const updates = new app.auditLog.formatters.UpdatesCollection()
        const pipelineId = request.params.pipelineId
        const pipeline = await app.db.models.Pipeline.byId(pipelineId)

        try {
            const reqName = request.body.pipeline.name?.trim()
            updates.push('name', pipeline.name, reqName)
            pipeline.name = reqName

            await pipeline.save()
        } catch (error) {
            if (error instanceof ValidationError) {
                if (error.errors[0]) {
                    return reply.status(400).type('application/json').send({ code: `invalid_${error.errors[0].path}`, error: error.errors[0].message })
                }

                return reply.status(400).type('application/json').send({ code: 'invalid_input', error: error.message })
            }

            app.log.error('Error while updating pipeline:')
            app.log.error(error)

            return reply.code(500).send({ code: 'unexpected_error', error: error.toString() })
        }

        const team = request.application.Team
        if (team) {
            await app.auditLog.Team.application.pipeline.updated(request.session.User, null, team, request.application, pipeline, updates)
        }

        reply.send(pipeline)
    })

    /**
     * Get details of a single stage within a pipeline
     * @name /api/v1/pipelines/:pipelineId/stages/:stageId
     * @memberof forge.routes.api.pipeline
     */
    app.get('/pipelines/:pipelineId/stages/:stageId', {
        preHandler: app.needsPermission('pipeline:read')
    }, async (request, reply) => {
        const stage = await app.db.models.PipelineStage.byId(request.params.stageId)
        if (!stage) {
            return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }

        if (stage.PipelineId !== request.pipeline.id) {
            return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }

        reply.send(await app.db.views.PipelineStage.stage(stage))
    })

    /**
     * Add a new stage to an existing Pipeline
     * @name /api/v1/pipelines/:pipelineId/stages
     * @memberof forge.routes.api.pipeline
     */
    app.post('/pipelines/:pipelineId/stages', {
        preHandler: app.needsPermission('pipeline:edit'),
        schema: {
            summary: 'Add a new stage to an existing pipeline',
            tags: ['Pipelines'],
            params: {
                type: 'object',
                properties: {
                    pipelineId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    instanceId: { type: 'string' },
                    deviceId: { type: 'string' },
                    deviceGroupId: { type: 'string' },
                    source: { type: 'string' },
                    action: { type: 'string', enum: Object.values(app.db.models.PipelineStage.SNAPSHOT_ACTIONS) }
                }
            },
            response: {
                200: {
                    $ref: 'PipelineStage'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const team = await request.teamMembership.getTeam()
        const name = request.body.name?.trim() // name of the stage
        const { instanceId, deviceId, deviceGroupId, deployToDevices, action } = request.body

        let stage
        try {
            const options = {
                name,
                instanceId,
                deviceId,
                deviceGroupId,
                deployToDevices,
                action
            }
            if (request.body.source) {
                options.source = request.body.source
            }
            stage = await app.db.controllers.Pipeline.addPipelineStage(
                request.pipeline,
                options
            )
        } catch (error) {
            if (handleValidationError(error, reply)) {
                return
            }

            if (handleControllerError(error, reply)) {
                return
            }

            app.log.error('Error while creating pipeline stage:')
            app.log.error(error)

            return reply.status(500).send({ code: 'unexpected_error', error: error.toString() })
        }
        await app.auditLog.Team.application.pipeline.stageAdded(request.session.User, null, team, request.application, request.pipeline, stage)

        if (instanceId) {
            const instance = await app.db.models.Project.byId(instanceId)
            await app.auditLog.Project.project.assignedToPipelineStage(request.session.User, null, instance, request.pipeline, stage)
        }

        // PipelineStage.byId includes devices and instance objects
        const hydratedStage = await app.db.models.PipelineStage.byId(stage.id)

        reply.send(await app.db.views.PipelineStage.stage(hydratedStage))
    })

    /**
     * Update details of a single stage within a pipeline
     * @name /api/v1/pipelines/:pipelineId/stages/:stageId
     * @memberof forge.routes.api.pipeline
     */
    app.put('/pipelines/:pipelineId/stages/:stageId', {
        preHandler: app.needsPermission('pipeline:edit'),
        schema: {
            summary: 'Update details of a stage within a pipeline',
            tags: ['Pipelines'],
            params: {
                type: 'object',
                properties: {
                    pipelineId: { type: 'string' },
                    stageId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    instanceId: { type: 'string' },
                    deviceId: { type: 'string' },
                    deviceGroupId: { type: 'string' },
                    action: { type: 'string', enum: Object.values(app.db.models.PipelineStage.SNAPSHOT_ACTIONS) }
                }
            },
            response: {
                200: {
                    $ref: 'PipelineStage'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            const options = {
                name: request.body.name,
                instanceId: request.body.instanceId,
                deployToDevices: request.body.deployToDevices,
                action: request.body.action,
                deviceId: request.body.deviceId,
                deviceGroupId: request.body.deviceGroupId
            }

            const stage = await app.db.controllers.Pipeline.updatePipelineStage(
                request.params.stageId,
                options
            )

            reply.send(await app.db.views.PipelineStage.stage(stage))
        } catch (error) {
            if (error instanceof ValidationError) {
                if (error.errors[0]) {
                    return reply.status(400).type('application/json').send({ code: `invalid_${error.errors[0].path}`, error: error.errors[0].message })
                }

                return reply.status(400).type('application/json').send({ code: 'invalid_input', error: error.message })
            }

            if (handleControllerError(error, reply)) {
                return
            }

            app.log.error('Error while updating pipeline stage:')
            app.log.error(error)

            return reply.code(500).send({ code: 'unexpected_error', error: error.toString() })
        }
    })

    /**
     * Delete a pipeline stage
     * @name /api/v1/pipelines/:pipelineId/stages/:stageId
     * @memberof forge.routes.api.pipeline
     */
    app.delete('/pipelines/:pipelineId/stages/:stageId', {
        preHandler: app.needsPermission('pipeline:delete'),
        schema: {
            summary: 'Delete a pipeline stage',
            tags: ['Pipelines'],
            params: {
                type: 'object',
                properties: {
                    pipelineId: { type: 'string' },
                    stageId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
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
            const stageId = request.params.stageId

            const stage = await app.db.models.PipelineStage.byId(stageId)
            if (!stage) {
                return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }

            if (stage.PipelineId !== request.pipeline.id) {
                return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }

            // Update the previous stage to point to the next stage when this model is deleted
            // e.g. A -> B -> C to A -> C when B is deleted
            const previousStage = await app.db.models.PipelineStage.byNextStage(stageId)
            if (previousStage) {
                if (stage.NextStageId) {
                    previousStage.NextStageId = stage.NextStageId
                } else {
                    previousStage.NextStageId = null
                }

                await previousStage.save()
            }

            await stage.destroy()

            // TODO - Audit log entry?

            reply.send({ status: 'okay' })
        } catch (err) {
            reply.code(500).send({ code: 'unexpected_error', error: err.toString() })
        }
    })

    /**
     * Deploy one stage to another stage
     * Approach depends on stage.action
     */
    app.put('/pipelines/:pipelineId/stages/:stageId/deploy', {
        preHandler: app.needsPermission('pipeline:edit'),
        schema: {
            summary: 'Triggers a pipeline stage',
            tags: ['Pipelines'],
            params: {
                type: 'object',
                properties: {
                    pipelineId: { type: 'string' },
                    stageId: { type: 'string' }
                }
            },
            body: {
                type: ['object', 'null'],
                properties: {
                    sourceSnapshotId: { type: 'string', description: 'The snapshot to deploy if the stage action is set to "prompt"' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
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
        const user = request.session.User
        const teamMembership = request.teamMembership

        let repliedEarly = false
        let sourceDeployed, deployTarget
        try {
            const sourceStage = await app.db.models.PipelineStage.byId(
                request.params.stageId
            )

            const {
                sourceInstance,
                targetInstance,
                sourceDevice,
                targetDevice,
                targetDeviceGroup,
                targetStage
            } = await app.db.controllers.Pipeline.validateSourceStageForDeploy(
                request.pipeline,
                sourceStage
            )

            // Only Owners can trigger a pipeline to a protected instance
            // Test before source snapshot is taken
            if (targetInstance) {
                const protectedInstance = await targetInstance.getSetting(KEY_PROTECTED)
                if (protectedInstance?.enabled && teamMembership.role !== Roles.Owner) {
                    // reject
                    reply.code(403).send({ code: 'protected_instance', error: 'Only Owner can Deploy to target instance' })
                    repliedEarly = true
                    return
                }
            }

            let sourceSnapshot
            if (sourceInstance) {
                sourceSnapshot = await app.db.controllers.Pipeline.getOrCreateSnapshotForSourceInstance(
                    sourceStage,
                    sourceInstance,
                    request.body?.sourceSnapshotId,
                    {
                        pipeline: request.pipeline,
                        user,
                        targetStage
                    }
                )
                sourceDeployed = sourceInstance
            } else if (sourceDevice) {
                sourceSnapshot = await app.db.controllers.Pipeline.getOrCreateSnapshotForSourceDevice(
                    sourceStage,
                    sourceDevice,
                    request.body?.sourceSnapshotId
                )
                sourceDeployed = sourceDevice
            } else {
                throw new Error('No source device or instance found.')
            }

            if (targetInstance) {
                const deployPromise = app.db.controllers.Pipeline.deploySnapshotToInstance(
                    sourceSnapshot,
                    targetInstance,
                    targetStage.deployToDevices ?? false,
                    {
                        pipeline: request.pipeline,
                        sourceStage,
                        sourceInstance,
                        sourceDevice,
                        targetStage,
                        user
                    }
                )

                reply.code(200).send({ status: 'importing' })
                repliedEarly = true
                deployTarget = targetInstance
                await deployPromise
            } else if (targetDevice) {
                const deployPromise = app.db.controllers.Pipeline.deploySnapshotToDevice(
                    sourceSnapshot,
                    targetDevice,
                    {
                        user

                    })

                reply.code(200).send({ status: 'importing' })
                repliedEarly = true
                deployTarget = targetDevice
                await deployPromise
            } else if (targetDeviceGroup) {
                const deployPromise = app.db.controllers.Pipeline.deploySnapshotToDeviceGroup(
                    sourceSnapshot,
                    targetDeviceGroup,
                    {
                        user
                    })

                reply.code(200).send({ status: 'importing' })
                repliedEarly = true
                deployTarget = targetDeviceGroup
                await deployPromise
            } else {
                throw new Error('No target device or instance found.')
            }

            await teamLogger.application.pipeline.stageDeployed(request.session.User, null, request.application.Team, request.application, request.pipeline, sourceDeployed, deployTarget)
        } catch (err) {
            if (repliedEarly) {
                console.warn('Deploy failed, but response already sent', err)
            } else {
                if (err instanceof ControllerError) {
                    return reply
                        .code(err.statusCode || 400)
                        .send({
                            code: err.code || 'unexpected_error',
                            error: err.error || err.message
                        })
                }

                return reply.code(err.statusCode || 500).send({
                    code: err.code || 'unexpected_error',
                    error: err.error || err.message
                })
            }
        }
    })

    /**
     * List all pipelines within an Application
     * /api/v1/applications/:id/pipelines
     */
    app.get('/applications/:applicationId/pipelines', {
        preHandler: app.needsPermission('application:pipeline:list'),
        schema: {
            summary: 'List all pipelines within an application',
            tags: ['Pipelines'],
            params: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        count: { type: 'number' },
                        pipelines: { $ref: 'PipelineList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const pipelines = await app.db.models.Pipeline.byApplicationId(request.application.hashid)
        if (pipelines) {
            reply.send({
                count: pipelines.length,
                pipelines: await app.db.views.Pipeline.pipelineList(pipelines)
            })
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    function handleValidationError (error, reply) {
        if (error instanceof ValidationError) {
            if (error.errors[0]) {
                return reply.status(400).type('application/json').send({ code: `invalid_${error.errors[0].path}`, error: error.errors[0].message })
            }

            reply.status(400).type('application/json').send({ code: 'invalid_input', error: error.message })
            return true // handled
        }
        return false // not handled
    }

    function handleControllerError (error, reply) {
        if (error instanceof ControllerError) {
            reply
                .code(error.statusCode || 400)
                .send({
                    code: error.code || 'unexpected_error',
                    error: error.error || error.message
                })
            return true // handled
        }
        return false // not handled
    }
}
