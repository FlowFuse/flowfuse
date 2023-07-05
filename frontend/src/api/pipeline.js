import product from '../services/product.js'

import client from './client.js'

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
        deployToDevices: stage.deployToDevices
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
 * Deploy pipeline stage
 * */
const deployPipelineStage = async (pipelineId, sourceStageId) => {
    return client.put(`/api/v1/pipelines/${pipelineId}/stages/${sourceStageId}/deploy`).then(res => {
        return res.data
    })
}

export default {
    getPipelineStage,
    addPipelineStage,
    updatePipelineStage,
    deletePipelineStage,
    deployPipelineStage
}
