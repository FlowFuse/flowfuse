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
        res.data.types = res.data.types.map(teamType => {
            teamType.value = teamType.id
            teamType.label = teamType.name
            teamType.htmlDescription = marked.parse(teamType.description || '')
            // TeamType is considered 'free' if:
            // - no billing settings
            // - billing is explicitly disabled
            // - billing.description is blank or equal 'free'
            teamType.isFree = teamType.properties?.billing?.disabled || !teamType.properties?.billing?.description || teamType.properties?.billing?.description === 'free'
            if (!teamType.isFree) {
                const [price, interval] = teamType.properties?.billing?.description.split('/')
                teamType.billingPrice = price
                teamType.billingInterval = interval
                if (teamType.properties?.billing?.yrDescription) {
                    const [annualPrice, annualInterval] = teamType.properties.billing.yrDescription.split('/')
                    teamType.annualBillingPrice = annualPrice
                    teamType.annualBillingInterval = annualInterval
                }
            } else {
                teamType.billingPrice = 'free'
                teamType.billingInterval = ''
            }
            return teamType
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
