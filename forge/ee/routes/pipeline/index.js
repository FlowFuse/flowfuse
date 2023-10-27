const { ValidationError } = require('sequelize')

const { registerPermissions } = require('../../../lib/permissions')
const { Roles } = require('../../../lib/roles.js')

const { createSnapshot, copySnapshot, generateDeploySnapshotDescription, generateDeploySnapshotName } = require('../../../services/snapshots')

module.exports = async function (app) {
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

        // Security issue here, should check application is same team...

        let pipeline
        try {
            pipeline = await app.db.models.Pipeline.create({
                name,
                ApplicationId: request.application.id
            })
        } catch (err) {
            if (err instanceof ValidationError) {
                if (err.errors[0]) {
                    return reply.status(400).type('application/json').send({ code: `invalid_${err.errors[0].path}`, error: err.errors[0].message })
                }

                return reply.status(400).type('application/json').send({ code: 'invalid_input', error: err.message })
            }

            return reply.status(500).send({ code: 'unexpected_error', error: err.toString() })
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
        const pipelineId = request.params.pipelineId
        const pipeline = await app.db.models.Pipeline.byId(pipelineId)

        if (!pipeline) {
            return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }

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
        const { instanceId, deviceId, deployToDevices, action } = request.body

        let stage
        try {
            const options = {
                name,
                instanceId,
                deviceId,
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
        } catch (err) {
            app.log.error(err)
            return reply.status(500).send({ code: 'unexpected_error', error: err.toString() })
        }
        const instance = await app.db.models.Project.byId(instanceId)
        await app.auditLog.Team.application.pipeline.stageAdded(request.session.User, null, team, request.application, request.pipeline, stage)
        await app.auditLog.Project.project.assignedToPipelineStage(request.session.User, null, instance, request.pipeline, stage)

        // ById includes related models
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
            const stage = await app.db.models.PipelineStage.byId(request.params.stageId)

            if (request.body.name) {
                stage.name = request.body.name
            }

            if (request.body.action) {
                stage.action = request.body.action
            }

            if (request.body.instanceId !== null) {
                // Currently only one instance per stage is supported
                const instances = await stage.getInstances()
                for (const instance of instances) {
                    await stage.removeInstance(instance)
                }

                if (request.body.instanceId) {
                    await stage.addInstanceId(request.body.instanceId)
                }
            }

            if (request.body.deviceId !== null) {
                // Currently only one instance per stage is supported
                const devices = await stage.getDevices()
                for (const device of devices) {
                    await stage.removeDevice(device)
                }

                if (request.body.deviceId) {
                    await stage.addDeviceId(request.body.deviceId)
                }
            }

            if (request.body.deployToDevices !== undefined) {
                stage.deployToDevices = request.body.deployToDevices
            }

            await stage.save()

            // ById includes related models
            const hydratedStage = await app.db.models.PipelineStage.byId(stage.id)

            // TODO - Audit log entry?

            reply.send(await app.db.views.PipelineStage.stage(hydratedStage))
        } catch (err) {
            console.log(err)
            reply.code(500).send({ code: 'unexpected_error', error: err.toString() })
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

        const sourceStage = await app.db.models.PipelineStage.byId(request.params.stageId)

        if (!sourceStage) {
            return reply.code(404).send({ code: 'not_found', error: 'Source stage not found' })
        } else if (sourceStage.PipelineId !== request.pipeline.id) {
            return reply.code(400).send({ code: 'invalid_stage', error: 'Source stage must be part of the same pipeline' })
        }

        const targetStage = await app.db.models.PipelineStage.byId(sourceStage.NextStageId)

        if (!targetStage) {
            return reply.code(404).send({ code: 'not_found', error: 'Target stage not found' })
        } else if (targetStage.PipelineId !== request.pipeline.id) {
            return reply.code(400).send({ code: 'invalid_stage', error: 'Target stage must be part of the same pipeline' })
        }

        const sourceInstances = await sourceStage.getInstances()
        const sourceDevices = await sourceStage.getDevices()
        const totalSources = sourceInstances.length + sourceDevices.length
        if (totalSources === 0) {
            return reply.code(400).send({ code: 'invalid_stage', error: 'Source stage must have at least one instance or device' })
        } else if (totalSources > 1) {
            return reply.code(400).send({ code: 'invalid_stage', error: 'Deployments are currently only supported for source stages with a single instance or device' })
        }

        const targetInstances = await targetStage.getInstances()
        const targetDevices = await targetStage.getDevices()
        const totalTargets = targetInstances.length + targetDevices.length
        if (totalTargets === 0) {
            return reply.code(400).send({ code: 'invalid_stage', error: 'Target stage must have at least one instance or device' })
        } else if (targetInstances.length > 1) {
            return reply.code(400).send({ code: 'invalid_stage', error: 'Deployments are currently only supported for target stages with a single instance or device' })
        }

        const sourceInstance = sourceInstances[0]
        const targetInstance = targetInstances[0]

        const sourceDevice = sourceDevices[0]
        const targetDevice = targetDevices[0]

        const sourceObject = sourceInstance || sourceDevice
        const targetObject = targetInstance || targetDevice

        if (sourceObject.TeamId !== targetObject.TeamId) {
            return reply.code(403).send({ code: 'invalid_stage', error: `Source ${sourceInstance ? 'instance' : 'device'} and Target ${targetInstance ? 'instance' : 'device'} not in same team` })
        }

        sourceObject.Team = await app.db.models.Team.byId(sourceObject.TeamId)
        if (!sourceObject.Team) {
            return reply.code(404).send({ code: 'invalid_stage', error: `Target ${sourceInstance ? 'instance' : 'device'} not associated with a team` })
        }

        let sourceSnapshot
        try {
            if (sourceInstance) {
                if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.USE_LATEST_SNAPSHOT) {
                    sourceSnapshot = await sourceInstance.getLatestSnapshot()
                    if (!sourceSnapshot) {
                        return reply.code(400).send({ code: 'invalid_source_instance', error: 'No snapshots found for source stages instance but deploy action is set to use latest snapshot' })
                    }
                } else if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.CREATE_SNAPSHOT) {
                    sourceSnapshot = await createSnapshot(app, sourceInstance, user, {
                        name: generateDeploySnapshotName(),
                        description: generateDeploySnapshotDescription(sourceStage, targetStage, request.pipeline),
                        setAsTarget: false // no need to deploy to devices of the source
                    })
                } else if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.PROMPT) {
                    const sourceSnapshotId = request.body?.sourceSnapshotId
                    if (!sourceSnapshotId) {
                        return reply.code(400).send({ code: 'no_source_snapshot', error: 'Source snapshot is required as deploy action is set to prompt for snapshot' })
                    }

                    sourceSnapshot = await app.db.models.ProjectSnapshot.byId(sourceSnapshotId)
                    if (!sourceSnapshot) {
                        return reply.code(400).send({ code: 'invalid_source_snapshot', error: 'Source snapshot not found' })
                    }

                    if (sourceSnapshot.ProjectId !== sourceInstance.id) {
                        return reply.code(400).send({ code: 'invalid_source_snapshot', error: 'Source snapshot not associated with source instance' })
                    }
                } else {
                    return reply.code(400).send({ code: 'invalid_action', error: `Unsupported pipeline deploy action: ${sourceStage.action}` })
                }
            } else if (sourceDevice) {
                if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.USE_LATEST_SNAPSHOT) {
                    sourceSnapshot = await sourceDevice.getLatestSnapshot()
                    if (!sourceSnapshot) {
                        return reply.code(400).send({ code: 'invalid_source_instance', error: 'No snapshots found for source stages device but deploy action is set to use latest snapshot' })
                    }
                } else if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.CREATE_SNAPSHOT) {
                    return reply.code(400).send({ code: 'invalid_source_instance', error: 'When using a device as a source, create snapshot is not yet supported' })
                } else if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.PROMPT) {
                    const sourceSnapshotId = request.body?.sourceSnapshotId
                    if (!sourceSnapshotId) {
                        return reply.code(400).send({ code: 'no_source_snapshot', error: 'Source snapshot is required as deploy action is set to prompt for snapshot' })
                    }

                    sourceSnapshot = await app.db.models.ProjectSnapshot.byId(sourceSnapshotId)
                    if (!sourceSnapshot) {
                        return reply.code(400).send({ code: 'invalid_source_snapshot', error: 'Source snapshot not found' })
                    }

                    if (sourceSnapshot.DeviceId !== sourceDevice.id) {
                        return reply.code(400).send({ code: 'invalid_source_snapshot', error: 'Source snapshot not associated with source device' })
                    }
                } else {
                    return reply.code(400).send({ code: 'invalid_action', error: `Unsupported pipeline deploy action: ${sourceStage.action}` })
                }
            } else {
                throw Error('No source device or instance found.')
            }
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            reply.code(500).send(resp)
        }

        // TODO: Only targets INSTANCES right now, not devices
        const restartTargetInstance = targetInstance.state === 'running'

        let repliedEarly = false
        try {
            app.db.controllers.Project.setInflightState(targetInstance, 'importing')
            app.db.controllers.Project.setInDeploy(targetInstance)

            // Early return, status is loaded async
            reply.code(200).send({ status: 'importing' })
            repliedEarly = true

            const setAsTargetForDevices = targetStage.deployToDevices ?? false
            const targetSnapshot = await copySnapshot(app, sourceSnapshot, targetInstance, {
                importSnapshot: true, // target instance should import the snapshot
                setAsTarget: setAsTargetForDevices,
                decryptAndReEncryptCredentialsSecret: await sourceInstance.getCredentialSecret(),
                targetSnapshotProperties: {
                    name: generateDeploySnapshotName(sourceSnapshot),
                    description: generateDeploySnapshotDescription(sourceStage, targetStage, request.pipeline, sourceSnapshot)
                }
            })

            if (restartTargetInstance) {
                await app.containers.restartFlows(targetInstance)
            }

            await app.auditLog.Project.project.imported(user.id, null, targetInstance, sourceInstance) // technically this isn't a project event
            await app.auditLog.Project.project.snapshot.imported(user.id, null, targetInstance, sourceInstance, targetSnapshot)

            app.db.controllers.Project.clearInflightState(targetInstance)
        } catch (err) {
            app.db.controllers.Project.clearInflightState(targetInstance)

            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Project.project.imported(user.id, null, targetInstance, sourceInstance) // technically this isn't a project event
            await app.auditLog.Project.project.snapshot.imported(user.id, resp, targetInstance, sourceInstance, null)

            if (repliedEarly) {
                console.warn('Deploy failed, but response already sent', err)
            } else {
                reply.code(500).send(resp)
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
}
