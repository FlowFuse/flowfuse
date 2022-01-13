import client from './client';
import slugify from '@/utils/slugify';
import paginateUrl from '@/utils/paginateUrl';

const getTeams = async (cursor, limit) => {
    const url = paginateUrl('/api/v1/teams',cursor,limit);
    return client.get(url).then(res => {
        res.data.teams = res.data.teams.map(r => {
            r.link = { name: 'Team', params: { id: slugify(r.name) }}
            return r;
        })
        return res.data;
    });


}

export default {
    getTeams
}
