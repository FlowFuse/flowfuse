import client from './client';
import slugify from '@/utils/slugify';
import daysSince from '@/utils/daysSince';


const create = async (options) => {
    return client.post(`/api/v1/project`, options).then(res => {
        return res.data;
    });
}

const getProject = (project) => {
    const slug = slugify(project);
    return client.get(`/api/v1/project/${slug}`).then(res => {
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        return res.data;
    });
}

const getProjects = () => {
    return client.get('/api/v1/user/projects').then(res => {
        res.data.projects = res.data.projects.map(r => {
            r.createdSince = daysSince(r.createdAt)
            r.updatedSince = daysSince(r.updatedAt)
            r.link = { name: 'Project', params: { id: r.id }}
            r.team.link = { name: 'Team', params: { id: slugify(r.team.name) }}
            return r;
        })
        return res.data;
    });
}
const deleteProject = async (projectId) => {
    return client.delete(`/api/v1/project/${projectId}`)
}

const getProjectAuditLog = async (projectId, cursor, limit) => {
    const queryString = new URLSearchParams();
    if (cursor) {
        queryString.append("cursor",cursor)
    }
    if (limit) {
        queryString.append("limit",limit)
    }
    return client.get(`/api/v1/project/${projectId}/audit-log?${queryString.toString()}`).then(res => res.data)
}

const startProject = async (projectId) => {
    return client.post(`/api/v1/project/${projectId}/actions/start`).then(res => res.data)
}
const stopProject = async (projectId) => {
    return client.post(`/api/v1/project/${projectId}/actions/stop`).then(res => res.data)
}
const restartProject = async (projectId) => {
    return client.post(`/api/v1/project/${projectId}/actions/restart`).then(res => res.data)
}


export default {
    create,
    getProject,
    deleteProject,
    getProjects,
    getProjectAuditLog,
    startProject,
    stopProject,
    restartProject
}
