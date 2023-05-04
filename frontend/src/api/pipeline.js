
import product from '../services/product.js'

import client from './client.js'

/**
 * @param {string} pipelineId
 * @param {string} stageId
 */
const getPipelineStage = async (pipelineId, stageId) => {
    return client.get(`/api/v1/pipelines/${pipelineId}/stages/${stageId}`)
        .then(res => {
            return res.data
        })
}

/**
 * @param {string} pipelineId
 * @param {string} name
 */
const addPipelineStage = async (pipelineId, stage) => {
    const options = {
        name: stage.name,
        instance: stage.instance
    }
    if (stage.source) {
        options.source = stage.source
    }
    return client.post(`/api/v1/pipelines/${pipelineId}/stages`, options)
        .then(res => {
            // const props = {
            //     'pipeline-stage-name': options.name,
            //     'created-at': res.data.createdAt
            // }
            // product.capture('$ff-pipeline-stage-added', props, {
            //     team: options.teamId,
            //     application: res.data.id
            // })
            return res.data
        })
}

export default {
    getPipelineStage,
    addPipelineStage
}
