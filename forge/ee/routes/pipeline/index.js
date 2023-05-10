const { registerPermissions } = require('../../../lib/permissions')
const { Roles } = require('../../../lib/roles.js')

module.exports = async function (app) {
    registerPermissions({
        'pipeline:view': { description: 'View a pipeline', role: Roles.Member },
        'pipeline:edit': { description: 'Edit a pipeline', role: Roles.Owner },
        'application:pipelines:create': { description: 'Create a pipeline within an application', role: Roles.Owner },
        'application:pipelines:list': { description: 'List pipelines within an application', role: Roles.Member },
        'application:pipelines:delete': { description: 'Delete a pipeline from an application', role: Roles.Owner }
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
        } else {
            request.application = await app.db.models.Application.byId(request.pipeline.ApplicationId)
        }

        if (request.session.User) {
            request.teamMembership = await request.session.User.getTeamMembership(request.application.Team.id)
            if (!request.teamMembership && !request.session.User.admin) {
                return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
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
        const instanceId = request.body.instance // instance id

        let stage
        try {
            const options = {
                name,
                instance: instanceId
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

        reply.send(app.db.views.PipelineStage.stage(stage))
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
        reply.send(await app.db.views.PipelineStage.stage(stage))
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

        let pipeline
        try {
            pipeline = await app.db.models.Pipeline.create({
                name,
                ApplicationId: request.application.id
            })
        } catch (err) {
            console.error(err)
            return reply.status(500).send({ code: 'unexpected_error', error: err.toString() })
        }

        await app.auditLog.Team.application.pipeline.created(request.session.User, null, team, request.application, pipeline)

        reply.send(app.db.views.Pipeline.pipeline(pipeline))
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
}
