import client from './client'
import paginateUrl from '@/utils/paginateUrl'

const getTemplates = async (cursor, limit) => {
    const url = paginateUrl('/api/v1/templates', cursor, limit)
    return client.get(url).then(res => {
        res.data.templates = res.data.templates.map(r => {
            r.link = { name: 'Admin Template', params: { id: r.id } }
            return r
        })
        return res.data
    })
}

const getTemplate = async (templateId) => {
    return await client.get(`/api/v1/templates/${templateId}`).then(res => {
        return res.data
    })
}
const deleteTemplate = async (templateId) => {
    return await client.delete(`/api/v1/templates/${templateId}`)
}
const create = async (options) => {
    return client.post('/api/v1/templates/', options).then(res => {
        return res.data
    })
}

const updateTemplate = async (templateId, options) => {
    return client.put(`/api/v1/templates/${templateId}`, options).then(res => {
        return res.data
    })
}

export default {
    create,
    getTemplate,
    getTemplates,
    updateTemplate,
    deleteTemplate
}
