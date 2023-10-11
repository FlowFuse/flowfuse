import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

/**
 * Get all flow blueprints (formerly flow templates) from the backend
 * @param {string} state - 'active' (default), 'all' or 'inactive'
 * @param {G} cursor
 * @param {number} limit
 * @returns [{ id:number, active:boolean, name:string, description:string, createdAt:string, updatedAt:string }]
 */
const getFlowBlueprints = async (state = 'active', cursor, limit) => {
    const url = paginateUrl('/api/v1/flow-templates', cursor, limit, null, { filter: state })
    return client.get(url).then(res => {
        return res.data.templates
    })
}
export default {
    getFlowBlueprints
}
