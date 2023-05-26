module.exports = {
    async stage (app, stage) {
        const result = stage.toJSON()
        const filtered = {
            id: result.hashid,
            name: result.name
        }

        if (stage.Instances?.length > 0) {
            filtered.instances = await app.db.views.Project.instancesList(stage.Instances)
        }

        if (stage.NextStageId) {
            // Check stage actually exists before including it in response
            const nextStage = await app.db.models.PipelineStage.byId(stage.NextStageId)
            if (nextStage) {
                filtered.NextStageId = nextStage.hashid
            }
        }

        return filtered
    },
    async stageList (app, stages) {
        return await Promise.all(stages.map(app.db.views.PipelineStage.stage))
    }
}
