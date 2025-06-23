module.exports = function (app) {
    app.addSchema({
        $id: 'PipelineStage',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            instances: { $ref: 'InstanceSummaryList' },
            devices: {
                type: 'array',
                items: {
                    $ref: 'DeviceSummary'
                }
            },
            deviceGroups: {
                type: 'array',
                items: {
                    $ref: 'DeviceGroupPipelineSummary'
                }
            },
            gitRepo: {
                type: 'object',
                properties: {
                    gitTokenId: { type: 'string' },
                    url: { type: 'string' },
                    branch: { type: 'string' },
                    pullBranch: { type: 'string' },
                    pushPath: { type: 'string' },
                    pullPath: { type: 'string' },
                    lastPushAt: { type: 'string' },
                    lastPullAt: { type: 'string' },
                    status: { type: 'string' },
                    statusMessage: { type: 'string' },
                    credentialSecret: { type: 'boolean' }
                }
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

        if (stage.DeviceGroups?.length > 0) {
            filtered.deviceGroups = stage.DeviceGroups.map(app.db.views.DeviceGroup.deviceGroupPipelineSummary)
        }
        if (stage.PipelineStageGitRepo) {
            filtered.gitRepo = {
                gitTokenId: app.db.models.GitToken.encodeHashid(stage.PipelineStageGitRepo.GitTokenId),
                url: stage.PipelineStageGitRepo.url,
                branch: stage.PipelineStageGitRepo.branch,
                pullBranch: stage.PipelineStageGitRepo.pullBranch,
                pushPath: stage.PipelineStageGitRepo.pushPath,
                pullPath: stage.PipelineStageGitRepo.pullPath,
                lastPushAt: stage.PipelineStageGitRepo.lastPushAt,
                lastPullAt: stage.PipelineStageGitRepo.lastPullAt,
                status: stage.PipelineStageGitRepo.status,
                statusMessage: stage.PipelineStageGitRepo.statusMessage,
                // Never return the secret - but indicate if one is set
                credentialSecret: !!stage.PipelineStageGitRepo.credentialSecret
            }
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
        const orderedStages = app.db.models.PipelineStage.sortStages(stages)
        return await Promise.all(orderedStages.map(stage))
    }

    return {
        stage,
        stageList
    }
}
