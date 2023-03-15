import client from './client'
import paginateUrl from '@/utils/paginateUrl'
const marked = require('marked')

const getInstanceTypes = async (cursor, limit, filter) => {
    let url = paginateUrl('/api/v1/project-types', cursor, limit)
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
            pt.htmlDescription = marked.parse(pt.description)
            return pt
        })
        res.data.types.sort((A, B) => {
            if (A.order !== B.order) {
                return A.order - B.order
            } else {
                return A.name.localeCompare(B.name)
            }
        })
        return res.data
    })
}

const create = async (options) => {
    return client.post('/api/v1/project-types/', options).then(res => {
        return res.data
    })
}
const deleteInstanceType = async (instanceTypeId) => {
    return await client.delete(`/api/v1/project-types/${instanceTypeId}`)
}
const getInstanceType = async (instanceTypeId) => {
    return await client.get(`/api/v1/project-types/${instanceTypeId}`).then(res => {
        return res.data
    })
}
const updateInstanceType = async (instanceTypeId, options) => {
    return client.put(`/api/v1/project-types/${instanceTypeId}`, options).then(res => {
        return res.data
    })
}

export default {
    create,
    getInstanceType,
    deleteInstanceType,
    getInstanceTypes,
    updateInstanceType
}
