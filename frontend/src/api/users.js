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

/**
 * Calls api routes in users.js
 * See [routes/api/users.js](../../../forge/routes/api/users.js)
*/
export default {
    create,
    getUsers,
    deleteUser,
    updateUser
}
