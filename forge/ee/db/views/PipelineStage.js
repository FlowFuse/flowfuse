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

        if (stage.target) {
            const target = await app.db.models.PipelineStage.byId(result.target)
            if (target) {
                filtered.targetStage = target.hashid
            }
        }

        return filtered
    },
    async stageList (app, stages) {
        return await Promise.all(stages.map(app.db.views.PipelineStage.stage))
    }
}
