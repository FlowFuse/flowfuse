module.exports = function (app) {
    app.addSchema({
        $id: 'PipelineStage',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            instances: { type: 'array', items: { ref: 'InstanceSummaryList' } },
            NextStageId: { type: 'string' }
        }
    })
    async function stage (stage) {
        const result = stage.toJSON()
        const filtered = {
            id: result.hashid,
            name: result.name
        }

        if (stage.Instances?.length > 0) {
            filtered.instances = await app.db.views.Project.instancesSummaryList(stage.Instances)
        }

        if (stage.NextStageId) {
            // Check stage actually exists before including it in response
            const nextStage = await app.db.models.PipelineStage.byId(stage.NextStageId)
            if (nextStage) {
                filtered.NextStageId = nextStage.hashid
            }
        }

        return filtered
    }

    app.addSchema({
        $id: 'PipelineStageList',
        type: 'array',
        items: {
            ref: 'PipelineStage'
        }
    })
    async function stageList (stages) {
        return await Promise.all(stages.map(stage))
    }

    return {
        stage,
        stageList
    }
}
