import client from './client'
import paginateUrl from '@/utils/paginateUrl'

const getTeams = async (cursor, limit) => {
    const url = paginateUrl('/api/v1/teams', cursor, limit)
    return client.get(url).then(res => {
        res.data.teams = res.data.teams.map(r => {
            r.link = { name: 'Team', params: { id: r.slug } }
            return r
        })
        return res.data
    })
}

export default {
    getTeams
}
