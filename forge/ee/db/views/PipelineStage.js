module.exports = {
    stage: function (app, provider) {
        const result = provider.toJSON()
        const filtered = {
            id: result.hashid,
            name: result.name
        }
        return filtered
    },
    async stageList (app, stages) {
        console.log(stages)
        const list = await Promise.all(stages.map(async (stage) => {
            const s = app.db.views.PipelineStage.stage(stage)
            return s
        }))
        return list
    }
}
