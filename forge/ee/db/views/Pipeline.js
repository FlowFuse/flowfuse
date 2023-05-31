module.exports = {
    async pipeline (app, pipeline) {
        if (pipeline) {
            const result = pipeline.toJSON()
            const stages = await app.db.models.PipelineStage.byPipeline(result.id)
            const filtered = {
                id: result.hashid,
                name: result.name,
                stages: await app.db.views.PipelineStage.stageList(stages)
            }
            return filtered
        } else {
            return null
        }
    },
    async pipelineList (app, pipelines) {
        const list = await Promise.all(pipelines.map(async (pipeline) => {
            const p = app.db.views.Pipeline.pipeline(pipeline)
            return p
        }))
        return list
    }
}
