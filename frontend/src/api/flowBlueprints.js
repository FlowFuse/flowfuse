import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

/**
 * Get all flow blueprints from the backend
 * @param {string} state - 'active' (default), 'all' or 'inactive'
 * @param {G} cursor
 * @param {number} limit
 * @returns [{ id:number, active:boolean, name:string, description:string, category:string. createdAt:string, updatedAt:string }]
 */
const getFlowBlueprints = async (state = 'active', cursor, limit) => {
    const url = paginateUrl('/api/v1/flow-blueprints', cursor, limit, null, { filter: state })
    return client.get(url).then(res => {
        return res.data
    })
}

/**
 * Get an existing blueprint
 * @param {number} flowBlueprintId
 * @returns {{ id:number, active:boolean, name:string, description:string, category:string. createdAt:string, updatedAt:string, flows:string, modules:string }}
 */
const getFlowBlueprint = async (flowBlueprintId) => {
    return await client.get(`/api/v1/flow-templates/${flowBlueprintId}`).then(res => res.data)
}

/**
 * Create a new blueprint
 * @param {{active:boolean, name:string, description:string, category:string, flows:string, modules:string}} flowBlueprintProperties
 * @returns
 */
const createFlowBlueprint = async (flowBlueprintProperties) => {
    return client.post('/api/v1/flow-templates/', flowBlueprintProperties).then(res => {
        return res.data
    })
}

/**
 * Delete an existing blueprint
 * @param {number} flowBlueprintId
 */
const deleteFlowBlueprint = async (flowBlueprintId) => {
    return await client.delete(`/api/v1/flow-templates/${flowBlueprintId}`)
}

/**
 * Update an existing blueprint
 * @param {number} flowBlueprintId
 * @param {{active:boolean, name:string, description:string, category:string, flows:string, modules:string}} options
 * @returns
 */
const updateFlowBlueprint = async (flowBlueprintId, options) => {
    return client.put(`/api/v1/flow-templates/${flowBlueprintId}`, options).then(res => {
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
