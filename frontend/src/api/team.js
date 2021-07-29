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
    return client.get(`/api/v1/team/${slug}/projects`).then(res => res.data);
}
export default {
    getTeam,
    getTeams,
    getTeamProjects
}
