module.exports = {
    async stage (app, stage) {
        const result = stage.toJSON()
        const filtered = {
            id: result.hashid,
            name: result.name
        }

        if (stage.Projects && stage.Projects.length > 0) {
            const project = stage.Projects[0]
            filtered.instance = await app.db.views.Project.project(project, { includeSettings: false })
        }

        if (stage.target) {
            const target = await app.db.models.PipelineStage.byId(result.target)
            filtered.targetStage = target.hashid
        }

        return filtered
    },
    async stageList (app, stages) {
        const list = await Promise.all(stages.map(async (stage) => {
            const s = app.db.views.PipelineStage.stage(stage)
            return s
        }))
        return list
    }
}
