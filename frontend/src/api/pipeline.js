import product from '../services/product.js'
import elapsedTime from '../utils/elapsedTime.js'

import client from './client.js'

export const StageType = Object.freeze({
    INSTANCE: 'instance',
    DEVICE: 'device',
    DEVICEGROUP: 'device-group'
})

export const getStageType = (stage) => {
    if (stage.instance) {
        return StageType.INSTANCE
    } else if (stage.device) {
        return StageType.DEVICE
    } else if (stage.deviceGroup) {
        return StageType.DEVICEGROUP
    }
    return null
}

export const StageAction = Object.freeze({
    NONE: 'none',
    CREATE_SNAPSHOT: 'create_snapshot',
    USE_ACTIVE_SNAPSHOT: 'use_active_snapshot',
    USE_LATEST_SNAPSHOT: 'use_latest_snapshot',
    PROMPT: 'prompt'
})

/**
 * @param {string} pipelineId
 * @param {string} stageId
 */
const getPipelineStage = async (pipelineId, stageId) => {
    return client.get(`/api/v1/pipelines/${pipelineId}/stages/${stageId}`)
        .then(res => {
            // For now, in the UI, a pipeline stage can only have one instance/
            // In the backend, multiple instances per pipeline are supported
            // @see getPipelines in frontend Application API
            res.data.instance = res.data.instances?.[0]

            // Again, the backend supports multiple devices per stage but the UI
            // only exposes connecting one
            res.data.device = res.data.devices?.[0]
            if (res.data.device) {
                res.data.device.lastSeenSince = res.data.device.lastSeenAt ? elapsedTime(0, res.data.device.lastSeenMs) + ' ago' : ''
            }

            // Again, the backend supports multiple device groups per stage but the UI
            // only exposes connecting one
            res.data.deviceGroup = res.data.deviceGroups?.[0]

            // Frontend only supports one type of object per stage
            res.data.stageType = getStageType(res.data)

            return res.data
        })
}

/**
 * @param {string} pipelineId
 * @param {object} stage
 */
const addPipelineStage = async (pipelineId, stage) => {
    const options = {
        name: stage.name,
        instanceId: stage.instanceId,
        deviceId: stage.deviceId,
        deviceGroupId: stage.deviceGroupId,
        deployToDevices: stage.deployToDevices,
        action: stage.action
    }
    if (stage.source) {
        options.source = stage.source
    }
    return client.post(`/api/v1/pipelines/${pipelineId}/stages`, options)
        .then(res => {
            const props = {
                'pipeline-id': pipelineId,
                'pipeline-stage-name': options.name,
                'created-at': res.data.createdAt
            }
            product.capture('$ff-pipeline-stage-added', props, {
                instance: stage.instanceId
            })
            return res.data
        })
}

/**
 * @param {string} pipelineId
 * @param {string} stageId
 * @param {object} options New values
 */
const updatePipelineStage = async (pipelineId, stageId, options) => {
    return client.put(`/api/v1/pipelines/${pipelineId}/stages/${stageId}`, options).then(res => {
        return res.data
    })
}

/**
 * @param {string} pipelineId
 * @param {string} stageId
 */
const deletePipelineStage = async (pipelineId, stageId) => {
    return client.delete(`/api/v1/pipelines/${pipelineId}/stages/${stageId}`).then(res => {
        return res.data
    })
}

/**
 * @param {string} pipelineId
 * @param {string} sourceStageId
 * @param {string} targetStageId
 * @param {string} sourceSnapshotId Optional, required if source stage is set to prompt
 * Deploy pipeline stage
 * */
const deployPipelineStage = async (pipelineId, sourceStageId, sourceSnapshotId) => {
    const options = {}
    if (sourceSnapshotId) {
        options.sourceSnapshotId = sourceSnapshotId
    }
    return client.put(`/api/v1/pipelines/${pipelineId}/stages/${sourceStageId}/deploy`, options).then(res => {
        return res.data
    })
}

const getTeamPipelines = async (teamId, options = {}) => {
    return client.get(`/api/v1/teams/${teamId}/pipelines`, options).then(res => {
        return res.data
    })
}

export default {
    getPipelineStage,
    addPipelineStage,
    updatePipelineStage,
    deletePipelineStage,
    deployPipelineStage,
    getTeamPipelines
}
