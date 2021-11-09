import client from './client';
import slugify from '@/utils/slugify';
import daysSince from '@/utils/daysSince';

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

const getTeamProjects = async (teamId) => {
    let res = await client.get(`/api/v1/teams/${teamId}/projects`);
    let promises = [];
    res.data.projects = res.data.projects.map(r => {
        r.createdSince = daysSince(r.createdAt)
        r.updatedSince = daysSince(r.updatedAt)
        r.link = { name: 'Project', params: { id: slugify(r.id) }}
            
        //r.status = ['running','stopped','safe','error','starting'][Math.floor(Math.random()*5)]
        promises.push(client.get(`/api/v1/project/${r.id}`).then(p => {
            console.log("ben",p.data.meta.state)
            r.status = p.data.meta.state
        }).catch( err => {
            console.log("not found", err)
            r.status = "stopped"
        }))

        return r;
    })
    await Promise.all(promises);
    return res.data;
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
