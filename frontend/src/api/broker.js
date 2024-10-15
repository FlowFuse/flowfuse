import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

const getClients = (teamId, params, cursor, limit) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/broker/clients`, cursor, limit)
    return client.get(url, { params }).then(res => res.data)
}

const getClient = (teamId, username) => {
    return client.get(`/api/v1/teams/${teamId}/broker/client/${username}`).then( res =>  res.data )
}

const createClient = (teamId, username, password, acls) => {
    return client.post(`/api/v1/teams/${teamId}/broker/client`,{
        username,
        password,
        acls
    }).then(res => res.data)
}

const deleteClient = (teamId, username) => {
    return client.delete(`/api/v1/teams/${teamId}/broker/client/${username}`).then( res => res.data )
}

const modifyClient = (teamId, username, acls) => {
    return client.put(`/api/v1/teams/${teamId}/broker/client/${username}`,{
        acls
    }).then( res => res.data )
}

export default {
    getClients,
    getClient,
    createClient,
    deleteClient
}