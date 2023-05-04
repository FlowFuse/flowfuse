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

            console.log(request.pipeline)

            const application = await app.db.models.Application.byId(request.pipeline.ApplicationId)

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
        const name = request.body.name?.trim()

        let stage
        try {
            console.log(request.pipeline.id)
            stage = await app.db.models.PipelineStage.create({
                name,
                PipelineId: request.pipeline.id
            })
        } catch (err) {
            console.error(err)
            return reply.status(500).send({ code: 'unexpected_error', error: err.toString() })
        }

        // await app.auditLog.Team.application.created(request.session.User, null, team, application)

        reply.send(app.db.views.PipelineStage.stage(stage))
    })
}
