module.exports = function (app) {
    app.addSchema({
        $id: 'DevicesSummaryList'

    })

    app.addSchema({
        $id: 'PipelineStage',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            instances: { $ref: 'InstanceSummaryList' },
            devices: {
                type: 'array',
                $ref: 'InstanceSummary'
            },
            action: { type: 'string', enum: Object.values(app.db.models.PipelineStage.SNAPSHOT_ACTIONS) },
            NextStageId: { type: 'string' }
        }
    })

    async function stage (stage) {
        const result = stage.toJSON()
        const filtered = {
            id: result.hashid,
            name: result.name,
            action: result.action,
            deployToDevices: result.deployToDevices
        }

        if (stage.Instances?.length > 0) {
            filtered.instances = await app.db.views.Project.instancesSummaryList(stage.Instances)
        }

        if (stage.Devices?.length > 0) {
            filtered.devices = stage.Devices.map(app.db.views.Device.deviceSummary)
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
        return await Promise.all(orderedStages.map(stage))
    }

    return {
        stage,
        stageList
    }
}
