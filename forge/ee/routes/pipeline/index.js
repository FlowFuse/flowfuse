const { ValidationError } = require('sequelize')

const { registerPermissions } = require('../../../lib/permissions')
const { Roles } = require('../../../lib/roles.js')

const { createSnapshot, copySnapshot } = require('../../../services/snapshots')

module.exports = async function (app) {
    registerPermissions({
        'pipeline:view': { description: 'View a pipeline', role: Roles.Member },
        'pipeline:edit': { description: 'Edit a pipeline', role: Roles.Owner },
        'pipeline:delete': { description: 'Delete a pipeline stage', role: Roles.Owner },
        'application:pipelines:create': { description: 'Create a pipeline within an application', role: Roles.Owner },
        'application:pipelines:list': { description: 'List pipelines within an application', role: Roles.Member },
        'application:pipelines:delete': { description: 'Delete a pipeline from an application', role: Roles.Owner },
        'application:pipelines:update': { description: 'Update a pipeline within an application', role: Roles.Owner }
    })

    app.addHook('preHandler', async (request, reply) => {
        if (request.params.pipelineId) {
            const pipelineId = request.params.pipelineId
            request.pipeline = await app.db.models.Pipeline.byId(pipelineId)
            if (!request.pipeline) {
                return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
        if (request.params.applicationId) {
            const applicationId = request.params.applicationId
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
     * List all pipelines within an Application
     * @name /api/v1/application/:id/pipelines
     * @memberof forge.routes.api.application
     */
    app.get('/applications/:applicationId/pipelines', {
        preHandler: app.needsPermission('application:pipelines:list')
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

    /**
     * Create a new Pipeline within an Application
     * @name /api/v1/application/:id/pipelines
     * @memberof forge.routes.api.application
     */
    app.post('/applications/:applicationId/pipelines', {
        preHandler: app.needsPermission('application:pipelines:create')
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
     * Delete a Pipeline from an Application
     * @name /api/v1/application/:id/pipelines
     * @memberof forge.routes.api.application
     */
    app.delete('/applications/:applicationId/pipelines/:pipelineId', {
        preHandler: app.needsPermission('application:pipelines:delete')
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
     * Update a Pipeline within an Application
     * @name /api/v1/application/:id/pipelines
     * @memberof forge.routes.api.application
     */
    app.put('/applications/:applicationId/pipelines/:pipelineId', {
        preHandler: app.needsPermission('application:pipelines:update')
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
        preHandler: app.needsPermission('pipeline:view')
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
        preHandler: app.needsPermission('pipeline:edit')
    }, async (request, reply) => {
        const team = await request.teamMembership.getTeam()
        const name = request.body.name?.trim() // name of the stage
        const { instanceId, deployToDevices } = request.body

        let stage
        try {
            const options = {
                name,
                instanceId,
                deployToDevices
            }
            if (request.body.source) {
                options.source = request.body.source
            }
            stage = await app.db.controllers.Pipeline.addPipelineStage(
                request.pipeline,
                options
            )
        } catch (err) {
            console.error(err)
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
        preHandler: app.needsPermission('pipeline:edit')
    }, async (request, reply) => {
        try {
            const stage = await app.db.models.PipelineStage.byId(request.params.stageId)

            if (request.body.name) {
                stage.name = request.body.name
            }

            if (request.body.instanceId) {
                // Currently only one instance per stage is supported
                const instances = await stage.getInstances()
                for (const instance of instances) {
                    await stage.removeInstance(instance)
                }

                await stage.addInstanceId(request.body.instanceId)
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
            reply.code(500).send({ code: 'unexpected_error', error: err.toString() })
        }
    })

    /**
     * Delete a pipeline stage
     * @name /api/v1/pipelines/:pipelineId/stages/:stageId
     * @memberof forge.routes.api.pipeline
     */
    app.delete('/pipelines/:pipelineId/stages/:stageId', {
        preHandler: app.needsPermission('pipeline:delete')
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
     * Create snapshot
     * Copy over snapshot
     * Set snapshot as target (and restart etc as needed)
     */
    app.put('/pipelines/:pipelineId/stages/:stageId/deploy', {
        preHandler: app.needsPermission('application:pipelines:update')
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
        if (sourceInstances.length === 0) {
            return reply.code(400).send({ code: 'invalid_stage', error: 'Source stage must have at least one instance' })
        } else if (sourceInstances.length > 1) {
            return reply.code(400).send({ code: 'invalid_stage', error: 'Deployments are currently only supported for source stages with a single instance' })
        }

        const targetInstances = await targetStage.getInstances()
        if (targetInstances.length === 0) {
            return reply.code(400).send({ code: 'invalid_stage', error: 'Target stage must have at least one instance' })
        } else if (targetInstances.length > 1) {
            return reply.code(400).send({ code: 'invalid_stage', error: 'Deployments are currently only supported for target stages with a single instance' })
        }

        const sourceInstance = sourceInstances[0]
        const targetInstance = targetInstances[0]

        if (sourceInstance.TeamId !== targetInstance.TeamId) {
            return reply.code(403).send('Source instance and Target instance not in same team')
        }

        const restartTargetInstance = targetInstance.state === 'running'

        let repliedEarly = false
        try {
            app.db.controllers.Project.setInflightState(targetInstance, 'importing')
            app.db.controllers.Project.setInDeploy(targetInstance)

            // Early return, status is loaded async
            reply.code(200).send({ status: 'importing' })
            repliedEarly = true

            const sourceSnapshot = await createSnapshot(app, sourceInstance, user, {
                name: `Deploy Snapshot: ${new Date().toLocaleString('sv-SE')}`, // YYYY-MM-DD HH:MM:SS
                description: `Snapshot created for pipeline deployment from ${sourceStage.name} to ${targetStage.name} as part of pipeline ${request.pipeline.name}`,
                setAsTarget: false // no need to deploy to devices of the source
            })

            const setAsTargetForDevices = sourceStage.deployToDevices ?? false
            const targetSnapshot = await copySnapshot(app, sourceSnapshot, targetInstance, { // eslint-disable-line no-unused-vars
                importSnapshot: true, // target instance should import the snapshot
                setAsTarget: setAsTargetForDevices
            })

            if (restartTargetInstance) {
                await app.containers.restartFlows(targetInstance)
            }

            await app.auditLog.Project.project.imported(user.id, null, targetInstance, sourceInstance) // technically this isn't a project event
            await app.auditLog.Project.project.snapshot.imported(user.id, null, targetInstance, sourceInstance)

            app.db.controllers.Project.clearInflightState(targetInstance)
        } catch (err) {
            app.db.controllers.Project.clearInflightState(targetInstance)

            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Project.project.imported(user.id, null, targetInstance, sourceInstance) // technically this isn't a project event
            await app.auditLog.Project.project.snapshot.imported(user.id, resp, targetInstance, sourceInstance)

            if (!repliedEarly) {
                console.warn('Deploy failed, but response already sent', err)
                reply.code(500).send(resp)
            }
        }
    })
}
