module.exports = {
    async stage (app, stage) {
        const result = stage.toJSON()
        const filtered = {
            id: result.hashid,
            name: result.name,
            deployToDevices: result.deployToDevices
        }

        if (stage.Instances?.length > 0) {
            // TODO: this should be an instanceSummaryList - back that doesn't
            // exist in 1.8, so minimising the changes for this backport.
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
        // Must ensure the stages are listed in the correct order
        const stagesById = {}
        const backReferences = {}
        let pointer = null
        // Scan the list of stages
        //  - build an id->stage reference table
        //  - find the last stage (!NextStageId) and set pointer
        //  - build a reference table of which stage points at which
        stages.forEach(stage => {
            stagesById[stage.id] = stage
            if (!stage.NextStageId) {
                pointer = stage
            } else {
                backReferences[stage.NextStageId] = stage.id
            }
        })
        const orderedStages = []
        // Starting at the last stage, work back through the references
        while (pointer) {
            orderedStages.unshift(pointer)
            pointer = stagesById[backReferences[pointer.id]]
        }
        return await Promise.all(orderedStages.map(app.db.views.PipelineStage.stage))
    }
}
