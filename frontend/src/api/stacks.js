import client from './client'
import paginateUrl from '@/utils/paginateUrl'

const getStacks = async (cursor, limit, filter, projectType) => {
    let url = paginateUrl('/api/v1/stacks', cursor, limit)

    if (filter || projectType) {
        const queryString = new URLSearchParams()
        if (filter) {
            queryString.append('filter', filter)
        }
        if (projectType) {
            queryString.append('projectType', projectType)
        }
        const qs = queryString.toString()
        if (!/\?/.test(url)) {
            url += '?'
        } else {
            url += '&'
        }
        url += qs
    }

    return client.get(url).then(res => {
        return res.data
    })
}

const create = async (options) => {
    return client.post('/api/v1/stacks/', options).then(res => {
        return res.data
    })
}
const deleteStack = async (stackId) => {
    return await client.delete(`/api/v1/stacks/${stackId}`)
}
const getStack = async (stackId) => {
    return await client.get(`/api/v1/stacks/${stackId}`).then(res => {
        return res.data
    })
}
const updateStack = async (stackId, options) => {
    return client.put(`/api/v1/stacks/${stackId}`, options).then(res => {
        return res.data
    })
}

export default {
    create,
    getStack,
    deleteStack,
    getStacks,
    updateStack
}
