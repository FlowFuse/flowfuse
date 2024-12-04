import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

const getTeams = async (cursor, limit, query, filter) => {
    const url = paginateUrl('/api/v1/teams', cursor, limit, query, filter)
    return client.get(url).then(res => {
        res.data.teams = res.data.teams.map(r => {
            r.link = { name: 'Team', params: { team_slug: r.slug } }
            return r
        })
        return res.data
    })
}

const checkSlug = async (slug) => {
    return client.post('/api/v1/teams/check-slug', { slug }).then(res => {
        return res.data
    })
}
export default {
    getTeams,
    checkSlug
}
