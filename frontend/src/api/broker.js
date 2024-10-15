import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

const getClients = (teamId, params, cursor, limit) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/broker/users`, cursor, limit)
    return client.get(url, { params }).then(res => res.data)
}

const getClient = (teamId, username) => {

}

const createClient = (teamId, username, password, topics) => {

}

const deleteClient = (teamId, username) => {

}

const modifyClient = (teamId, username, topics) => {

}

export default {
    getClients
}