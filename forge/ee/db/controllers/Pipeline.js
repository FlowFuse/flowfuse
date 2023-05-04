
module.exports = {
    addPipelineStage: async function (app, pipeline, options) {
        let source
        options.PipelineId = pipeline.id
        if (options.source) {
            // this gives us the input stage to this new stage.
            // we store "targets", so need to update the source to point to this new stage
            source = options.source
            delete options.source
        }
        const stage = await app.db.models.PipelineStage.create(options)

        const project = await app.db.models.Project.byId(options.instance)
        project.PipelineStageId = stage.id
        await project.save()

        if (source) {
            const sourceStage = await app.db.models.PipelineStage.byId(source)
            sourceStage.target = stage.id
            await sourceStage.save()
        }

        return stage
    }
}
