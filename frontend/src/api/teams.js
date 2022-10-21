import client from './client'
import paginateUrl from '@/utils/paginateUrl'

const getTeams = async (cursor, limit, query) => {
    const url = paginateUrl('/api/v1/teams', cursor, limit, query)
    return client.get(url).then(res => {
        res.data.teams = res.data.teams.map(r => {
            r.link = { name: 'Team', params: { team_slug: r.slug } }
            return r
        })
        return res.data
    })
}

export default {
    getTeams
}
