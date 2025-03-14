import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

const marked = require('marked')

const getTeamTypes = async (cursor, limit, filter) => {
    let url = paginateUrl('/api/v1/team-types', cursor, limit)
    if (filter) {
        const queryString = new URLSearchParams()
        queryString.append('filter', filter)
        const qs = queryString.toString()
        if (!/\?/.test(url)) {
            url += '?'
        } else {
            url += '&'
        }
        url += qs
    }
    return client.get(url).then(res => {
        res.data.types = res.data.types.map(pt => {
            pt.value = pt.id
            pt.label = pt.name
            pt.htmlDescription = marked.parse(pt.description || '')
            // TeamType is considered 'free' if:
            // - no billing settings
            // - billing is explicitly disabled
            // - billing.description is blank or equal 'free'
            pt.isFree = pt.properties?.billing?.disabled || !pt.properties?.billing?.description || pt.properties?.billing?.description === 'free'
            if (!pt.isFree) {
                const [price, interval] = pt.properties?.billing?.description.split('/')
                pt.billingPrice = price
                pt.billingInterval = interval
            } else {
                pt.billingPrice = 'free'
                pt.billingInterval = ''
            }
            return pt
        })
        return res.data
    })
}

const create = async (options) => {
    return client.post('/api/v1/team-types/', options).then(res => {
        return res.data
    })
}

const updateTeamType = async (teamTypeId, options) => {
    return client.put(`/api/v1/team-types/${teamTypeId}`, options).then(res => {
        return res.data
    })
}

const deleteTeamType = async (teamTypeId) => {
    return await client.delete(`/api/v1/team-types/${teamTypeId}`)
}

export default {
    getTeamTypes,
    create,
    updateTeamType,
    deleteTeamType
}
