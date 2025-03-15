module.exports = function (app) {
    app.addSchema({
        $id: 'Pipeline',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            stages: { ref: 'PipelineStageList' }
        }
    })
    async function pipeline (pipeline) {
        if (pipeline) {
            const result = pipeline.toJSON()
            // TODO: This is an N+1 query
            const stages = await app.db.models.PipelineStage.byPipeline(result.id, { includeDeviceStatus: true })
            const filtered = {
                id: result.hashid,
                name: result.name,
                stages: await app.db.views.PipelineStage.stageList(stages)
            }

            return filtered
        } else {
            return null
        }
    }
    async function teamPipeline (pipeline) {
        if (pipeline) {
            const result = pipeline.toJSON()
            // TODO: This is an N+1 query
            const stages = await app.db.models.PipelineStage.byPipeline(result.id, { includeDeviceStatus: true })
            const filtered = {
                id: result.hashid,
                name: result.name,
                application: {
                    id: result.Application.hashid,
                    name: result.Application.name
                },
                stages: await app.db.views.PipelineStage.stageList(stages)
            }

            return filtered
        } else {
            return null
        }
    }

    app.addSchema({
        $id: 'PipelineList',
        type: 'array',
        items: {
            ref: 'Pipeline'
        }
    })
    async function pipelineList (pipelines) {
        const list = await Promise.all(pipelines.map(pipeline))
        return list
    }

    async function teamPipelineList (pipelines) {
        const list = await Promise.all(pipelines.map(teamPipeline))
        return list
    }

    return {
        pipeline,
        pipelineList,
        teamPipelineList
    }
}
