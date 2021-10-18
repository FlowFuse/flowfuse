import client from './client';
import slugify from '@/utils/slugify';

const getTeams = () => {
    return client.get('/api/v1/user/teams').then(res => {
        res.data.teams = res.data.teams.map(r => {
            r.link = { name: 'Team', params: { id: slugify(r.name) }}
            return r;
        })
        return res.data;
    });
}

const getTeam = (team) => {
    let url;
    if (typeof team === 'object') {
        url = `/api/v1/teams/?slug=${team.slug}`
    } else {
        url = `/api/v1/teams/${team}`
    }
    return client.get(url).then(res => res.data);
}

const getTeamProjects = (teamId) => {
    return client.get(`/api/v1/teams/${teamId}/projects`).then(res => {
        res.data.projects = res.data.projects.map(r => {
            r.link = { name: 'Project', params: { id: slugify(r.id) }}
            return r;
        })
        return res.data;
    });
}

const getTeamMembers = (teamId) => {
    return client.get(`/api/v1/teams/${teamId}/members`).then(res => {
        return res.data;
    });
}

const create = async (options) => {
    return client.post(`/api/v1/teams/`, options).then(res => {
        return res.data;
    });
}

const changeTeamMemberRole = (teamId, userId, role) => {
    const opts = {
        role: role
    }
    return client.put(`/api/v1/teams/${teamId}/members/${userId}`,opts)
}

const removeTeamMember = (teamId, userId) => {
    return client.delete(`/api/v1/teams/${teamId}/members/${userId}`)
}

export default {
    create,
    getTeam,
    getTeams,
    getTeamProjects,
    getTeamMembers,
    changeTeamMemberRole,
    removeTeamMember
}
