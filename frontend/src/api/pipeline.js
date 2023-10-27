import product from '../services/product.js'

import client from './client.js'

const StageType = Object.freeze({
    INSTANCE: 'instance',
    DEVICE: 'device'
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

            // Frontend only supports one type of object per stage
            res.data.stageType = res.data.instance ? StageType.INSTANCE : (res.data.device ? StageType.DEVICE : null)

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

export { StageType }

export default {
    getPipelineStage,
    addPipelineStage,
    updatePipelineStage,
    deletePipelineStage,
    deployPipelineStage
}
