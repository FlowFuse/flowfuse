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
    const slug = slugify(team);
    return client.get(`/api/v1/team/${slug}`).then(res => res.data);
}

const getTeamProjects = (team) => {
    const slug = slugify(team);
    return client.get(`/api/v1/team/${slug}/projects`).then(res => {
        res.data.projects = res.data.projects.map(r => {
            r.link = { name: 'Project', params: { id: slugify(r.id) }}
            return r;
        })
        return res.data;
    });
}

const create = async (options) => {
    return client.post(`/api/v1/team/`, options).then(res => {
        return res.data;
    });
}


export default {
    create,
    getTeam,
    getTeams,
    getTeamProjects
}
