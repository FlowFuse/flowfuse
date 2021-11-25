import client from './client';
import slugify from '@/utils/slugify';
import daysSince from '@/utils/daysSince';
import elapsedTime from '@/utils/elapsedTime';

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
        promises.push(client.get(`/api/v1/project/${r.id}`).then(p => {
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

const getTeamInvitations = (teamId) => {
    return client.get(`/api/v1/teams/${teamId}/invitations`).then(res => {
        res.data.invitations = res.data.invitations.map(r => {
            r.createdSince = daysSince(r.createdAt)
            r.expires = elapsedTime((new Date(r.expiresAt)).getTime() - Date.now())
            return r;
        });
        return res.data;
    });
}
const createTeamInvitation = (teamId, userDetails) => {
    const opts = {
        user: userDetails
    }
    return client.post(`/api/v1/teams/${teamId}/invitations`, opts).then(res => {
        return res.data;
    });
}
const removeTeamInvitation = (teamId, inviteId) => {
    return client.delete(`/api/v1/teams/${teamId}/invitations/${inviteId}`);
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

const getTeamAuditLog = async (teamId, cursor, limit) => {
    const queryString = new URLSearchParams();
    if (cursor) {
        queryString.append("cursor",cursor)
    }
    if (limit) {
        queryString.append("limit",limit)
    }
    return client.get(`/api/v1/teams/${teamId}/audit-log?${queryString.toString()}`).then(res => res.data)
}
const getTeamUserMembership = (teamId) => {
    return client.get(`/api/v1/teams/${teamId}/user`).then(res => res.data)
}
const updateTeam = async(teamId, options) => {
    return client.put(`/api/v1/teams/${teamId}`, options).then(res => {
        return res.data
    })
}
export default {
    create,
    getTeam,
    updateTeam,
    getTeams,
    getTeamProjects,
    getTeamMembers,
    changeTeamMemberRole,
    removeTeamMember,
    getTeamInvitations,
    createTeamInvitation,
    removeTeamInvitation,
    getTeamAuditLog,
    getTeamUserMembership
}
