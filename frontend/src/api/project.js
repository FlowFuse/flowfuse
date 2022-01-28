import client from './client'
import slugify from '@/utils/slugify'
import daysSince from '@/utils/daysSince'
import paginateUrl from '@/utils/paginateUrl'

const create = async (options) => {
    return client.post('/api/v1/projects', options).then(res => {
        return res.data
    })
}

const getProject = (project) => {
    const slug = slugify(project)
    return client.get(`/api/v1/projects/${slug}`).then(res => {
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        return res.data
    })
}

const getProjects = () => {
    return client.get('/api/v1/user/projects').then(res => {
        res.data.projects = res.data.projects.map(r => {
            r.createdSince = daysSince(r.createdAt)
            r.updatedSince = daysSince(r.updatedAt)
            r.link = { name: 'Project', params: { id: r.id } }
            r.team.link = { name: 'Team', params: { id: slugify(r.team.name) } }
            return r
        })
        return res.data
    })
}
const deleteProject = async (projectId) => {
    return client.delete(`/api/v1/projects/${projectId}`)
}

const getProjectAuditLog = async (projectId, cursor, limit) => {
    const url = paginateUrl(`/api/v1/projects/${projectId}/audit-log`, cursor, limit)
    return client.get(url).then(res => res.data)
}

const getProjectLogs = async (projectId, cursor, limit) => {
    const url = paginateUrl(`/api/v1/projects/${projectId}/logs`, cursor, limit)
    return client.get(url).then(res => res.data)
}
const startProject = async (projectId) => {
    return client.post(`/api/v1/projects/${projectId}/actions/start`).then(res => res.data)
}
const stopProject = async (projectId) => {
    return client.post(`/api/v1/projects/${projectId}/actions/stop`).then(res => res.data)
}
const restartProject = async (projectId) => {
    return client.post(`/api/v1/projects/${projectId}/actions/restart`).then(res => res.data)
}
const updateProject = async (projectId, options) => {
    return client.put(`/api/v1/projects/${projectId}`, options).then(res => {
        return res.data
    })
}

export default {
    create,
    getProject,
    deleteProject,
    getProjects,
    getProjectLogs,
    getProjectAuditLog,
    startProject,
    stopProject,
    restartProject,
    updateProject
}
