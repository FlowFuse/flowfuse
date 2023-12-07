import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

/**
 * @typedef {Object} FlowBlueprintSummary
 * @property {number} id
 * @property {boolean} active
 * @property {string} name
 * @property {string} description
 * @property {string} category
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {object} FlowBlueprint
 * @extends FlowBlueprintSummary
 * @property {object} flows
 * @property {object} modules
 */

/**
 * Get all flow blueprints from the backend
 * @param {string} state - 'active' (default), 'all' or 'inactive'
 * @param {G} cursor
 * @param {number} limit
 * @returns {Array.<FlowBlueprintSummary>}
 */
const getFlowBlueprints = async (options = { default: false, state: 'active' }, cursor, limit) => {
    const url = paginateUrl('/api/v1/flow-blueprints', cursor, limit, null, { default: options.default, filter: options.state })
    return client.get(url).then(res => {
        return res.data
    })
}

/**
 * Get an existing blueprint
 * @param {number} flowBlueprintId
 * @returns {FlowBlueprint}
 */
const getFlowBlueprint = async (flowBlueprintId) => {
    return await client.get(`/api/v1/flow-blueprints/${flowBlueprintId}`).then(res => res.data)
}

/**
 * Create a new blueprint
 * @param {FlowBlueprint} flowBlueprintProperties
 * @returns
 */
const createFlowBlueprint = async (flowBlueprintProperties) => {
    return client.post('/api/v1/flow-blueprints/', flowBlueprintProperties).then(res => {
        return res.data
    })
}

/**
 * Delete an existing blueprint
 * @param {number} flowBlueprintId
 */
const deleteFlowBlueprint = async (flowBlueprintId) => {
    return await client.delete(`/api/v1/flow-blueprints/${flowBlueprintId}`)
}

/**
 * Update an existing blueprint
 * @param {number} flowBlueprintId
 * @param {FlowBlueprint} options
 * @returns {FlowBlueprint}
 */
const updateFlowBlueprint = async (flowBlueprintId, options) => {
    return client.put(`/api/v1/flow-blueprints/${flowBlueprintId}`, options).then(res => {
        return res.data
    })
}

export default {
    getFlowBlueprints,
    getFlowBlueprint,
    createFlowBlueprint,
    deleteFlowBlueprint,
    updateFlowBlueprint
}
