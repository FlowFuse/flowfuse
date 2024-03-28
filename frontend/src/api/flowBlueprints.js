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
 * @typedef {Object} FlowBlueprintDetails
 * @property {object} flows - Flow definition
 * @property {object} modules - Modules used in the flow
 * @property {Array.<string>} teamTypeScope - Team types allowed to use this blueprint
 */

/**
 * @typedef {FlowBlueprintSummary & FlowBlueprintDetails } FlowBlueprint
 */

/**
 * Get all flow blueprints from the backend
 * @param {object} options
 * @param {object} options.filter - 'active' (default), 'all' or 'inactive'
 * @param {number} cursor - Cursor for pagination
 * @param {number} limit - Limit for pagination
 * @returns {Array.<FlowBlueprintSummary>}
 */
const getFlowBlueprints = async (options = { filter: 'active' }, cursor, limit) => {
    const url = paginateUrl('/api/v1/flow-blueprints', cursor, limit, null, { filter: options.filter })
    return client.get(url).then(res => {
        return res.data
    })
}

/**
 * Get flow blueprints available to the current team
 * @param {string} team - Team ID
 * @param {object} options
 * @param {object} options.filter - 'active' (default), 'all' or 'inactive'
 * @param {number} cursor - Cursor for pagination
 * @param {number} limit - Limit for pagination
 * @returns {Array.<FlowBlueprintSummary>}
 */
const getFlowBlueprintsForTeam = async (team, options = { filter: 'active' }, cursor, limit) => {
    const extraParams = {
        filter: options.filter,
        team
    }
    const url = paginateUrl('/api/v1/flow-blueprints', cursor, limit, null, extraParams)
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
    getFlowBlueprintsForTeam,
    getFlowBlueprint,
    createFlowBlueprint,
    deleteFlowBlueprint,
    updateFlowBlueprint
}
