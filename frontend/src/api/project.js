import client from './client'
import slugify from '@/utils/slugify'
import daysSince from '@/utils/daysSince'
import paginateUrl from '@/utils/paginateUrl'

const create = async (options) => {
    return client.post('/api/v1/projects', options).then(res => {
        return res.data
    })
}

const getProject = (projectId) => {
    return client.get(`/api/v1/projects/${projectId}`).then(res => {
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
const suspendProject = async (projectId) => {
    return client.post(`/api/v1/projects/${projectId}/actions/suspend`).then(res => res.data)
}
const updateProject = async (projectId, options) => {
    return client.put(`/api/v1/projects/${projectId}`, options).then(res => {
        return res.data
    })
}
const rollbackProject = async (projectId, snapshotId) => {
    const data = {
        snapshot: snapshotId
    }
    return client.post(`/api/v1/projects/${projectId}/actions/rollback`, data).then(res => res.data)
}
const changeStack = async (projectId, stackId) => {
    return client.put(`/api/v1/projects/${projectId}`, { stack: stackId }).then(res => {
        return res.data
    })
}
// const exportProject = async (projectId, components) => {
//     return client.post(`/api/v1/projects/${projectId}/export`, { components: components }).then(res => {
//         console.log(res.data, typeof res.data)
//         const blob = new Blob([JSON.stringify(res.data)], { type: 'application/json' })
//         const disposition = res.headers['content-disposition']
//         const matches = /"([^"]*)"/.exec(disposition)
//         const filename = (matches != null && matches[1] ? matches[1] : 'project.json')
//         const link = document.createElement('a')
//         link.href = window.URL.createObjectURL(blob)
//         link.download = filename
//         document.body.appendChild(link)
//         link.click()
//         document.body.removeChild(link)
//     })
// }

const getProjectDevices = async (projectId, cursor, limit) => {
    const url = paginateUrl(`/api/v1/projects/${projectId}/devices`, cursor, limit)
    const res = await client.get(url)
    res.data.devices.forEach(device => {
        device.lastSeenSince = device.lastSeenAt ? daysSince(device.lastSeenAt) : ''
    })
    return res.data
}

const getProjectDeviceSettings = async (projectId) => {
    return client.get(`/api/v1/projects/${projectId}/devices/settings`).then(res => res.data)
}
const updateProjectDeviceSettings = async (projectId, settings) => {
    return client.post(`/api/v1/projects/${projectId}/devices/settings`, settings).then(res => res.data)
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
    suspendProject,
    updateProject,
    rollbackProject,
    changeStack,
    getProjectDevices,
    getProjectDeviceSettings,
    updateProjectDeviceSettings
}
