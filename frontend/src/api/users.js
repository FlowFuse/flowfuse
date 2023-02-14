import client from './client'
import paginateUrl from '@/utils/paginateUrl'

const create = async (options) => {
    return client.post('/api/v1/users', options).then(res => {
        return res.data
    })
}

const deleteUser = async (userId) => {
    return client.delete(`/api/v1/users/${userId}`).then(res => {
        return res.data
    })
}

const getUsers = (cursor, limit, query) => {
    const url = paginateUrl('/api/v1/users', cursor, limit, query)
    return client.get(url).then(res => res.data)
}

const updateUser = async (userId, options) => {
    return client.put(`/api/v1/users/${userId}`, options).then(res => {
        return res.data
    })
}

const getUser = async (userId) => {
    return client.get(`/api/v1/users/${userId}`).then(res => {
        return res.data
    })
}
const getUserTeams = async (userId, cursor, limit, query) => {
    const url = paginateUrl(`/api/v1/users/${userId}/teams`, cursor, limit, query)
    return client.get(url).then(res => {
        res.data.teams = res.data.teams.map(r => {
            r.link = { name: 'Team', params: { team_slug: r.slug } }
            return r
        })
        return res.data
    })
}
/**
 * Calls api routes in users.js
 * See [routes/api/users.js](../../../forge/routes/api/users.js)
*/
export default {
    create,
    getUsers,
    deleteUser,
    updateUser,
    getUser,
    getUserTeams
}
