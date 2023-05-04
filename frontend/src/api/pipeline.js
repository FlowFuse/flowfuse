
import product from '../services/product.js'

import client from './client.js'

/**
 * @param {string} pipelineId
 * @param {string} name
 */
const addPipelineStage = async (pipelineId, name) => {
    const options = {
        name
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
    addPipelineStage
}
