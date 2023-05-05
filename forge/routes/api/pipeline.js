module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
        const pipelineId = request.params.pipelineId
        if (pipelineId === undefined) {
            return
        }

        if (!pipelineId) {
            return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }

        try {
            request.pipeline = await app.db.models.Pipeline.byId(pipelineId)
            if (!request.pipeline) {
                return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }

            const application = await app.db.models.Application.byId(request.pipeline.ApplicationId)

            request.application = application

            if (request.session.User) {
                request.teamMembership = await request.session.User.getTeamMembership(application.Team.id)
                if (!request.teamMembership && !request.session.User.admin) {
                    return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            }
        } catch (err) {
            return reply.code(500).send({ code: 'unexpected_error', error: err.toString() })
        }
    })

    /**
     * Add a new stage to an existing Pipeline
     * @name /api/v1/pipeline/:pipelineId/stages
     * @memberof forge.routes.api.pipeline
     */
    app.post('/:pipelineId/stages', {
        // TODO: What permissions are required here?
        preHandler: app.needsPermission('team:projects:list')
    }, async (request, reply) => {
        const team = await request.teamMembership.getTeam()
        const name = request.body.name?.trim() // name of the stage
        const instance = request.body.instance // instance id

        let stage
        try {
            const options = {
                name,
                instance
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

        await app.auditLog.Team.application.pipeline.stageAdded(request.session.User, null, team, request.application, request.pipeline)
        await app.auditLog.Project.assignedToPipelineStage(request.session.User, null, instance, request.pipeline, stage)

        reply.send(app.db.views.PipelineStage.stage(stage))
    })

    /**
     * Get details of a single stage within a pipeline
     * @name /api/v1/pipeline/:pipelineId/stages/:stageId
     * @memberof forge.routes.api.pipeline
     */
    app.get('/:pipelineId/stages/:stageId', {
        // TODO: What permissions are required here?
        preHandler: app.needsPermission('team:projects:list')
    }, async (request, reply) => {
        const stage = await app.db.models.PipelineStage.byId(request.params.stageId)
        reply.send(await app.db.views.PipelineStage.stage(stage))
    })
}
