import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

// FF Broker

const getClients = (teamId, params, cursor, limit) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/broker/clients`, cursor, limit)
    return client.get(url, { params }).then(res => res.data)
}

const getClient = (teamId, username) => {
    return client.get(`/api/v1/teams/${teamId}/broker/client/${username}`).then(res => res.data)
}

const createClient = (teamId, username, password, acls) => {
    return client.post(`/api/v1/teams/${teamId}/broker/client`, {
        username,
        password,
        acls
    }).then(res => res.data)
}

const deleteClient = (teamId, username) => {
    return client.delete(`/api/v1/teams/${teamId}/broker/client/${username}`).then(res => res.data)
}

const updateClient = (teamId, username, { acls, password }) => {
    return client.put(`/api/v1/teams/${teamId}/broker/client/${username}`, {
        acls,
        password
    }).then(res => res.data)
}

// Third Party Brokers

const getBrokers = (teamId) => {
    return client.get(`/api/v1/teams/${teamId}/brokers`)
        .then(res => res.data)
}

const getBrokerStatus = (teamId, brokerId) => {
    return client.get(`/api/v1/teams/${teamId}/brokers/${brokerId}`)
        .then(res => res.data)
}

const createBroker = (teamId, payload) => {
    return client.post(`/api/v1/teams/${teamId}/brokers`, payload)
        .then(res => res.data)
}

const updateBroker = (teamId, brokerId, payload) => {
    return client.put(`/api/v1/teams/${teamId}/brokers/${brokerId}`, payload)
        .then(res => res.data)
}

const deleteBroker = (teamId, brokerId) => {
    return client.delete(`/api/v1/teams/${teamId}/brokers/${brokerId}`)
        .then(res => res.data)
}

const getBrokerTopics = (teamId, brokerId) => {
    return client.get(`/api/v1/teams/${teamId}/brokers/${brokerId}/topics`)
        .then(res => res.data)
}

const addBrokerTopic = (teamId, brokerId, payload) => {
    return client.post(`/api/v1/teams/${teamId}/brokers/${brokerId}/topics`, payload)
        .then(res => res.data)
}
const updateBrokerTopic = (teamId, brokerId, topicId, payload) => {
    return client.put(`/api/v1/teams/${teamId}/brokers/${brokerId}/topics/${topicId}`, payload)
        .then(res => res.data)
}

const startBroker = (teamId, brokerId) => {
    return client.post(`/api/v1/teams/${teamId}/brokers/${brokerId}/start`)
        .then(res => res.data)
}

const stopBroker = (teamId, brokerId) => {
    return client.post(`/api/v1/teams/${teamId}/brokers/${brokerId}/stop`)
        .then(res => res.data)
}

const suspendBroker = (teamId, brokerId) => {
    return client.post(`/api/v1/teams/${teamId}/brokers/${brokerId}/suspend`)
        .then(res => res.data)
}

const getJsonSchema = (teamId, brokerId) => {
    return client.get(`/api/v1/teams/${teamId}/broker/${brokerId}/schema`)
        .then(res => res.data)
}

const deleteBrokerTopic = (teamId, brokerId, topicId) => {
    return client.delete(`/api/v1/teams/${teamId}/brokers/${brokerId}/topics/${topicId}`)
        .then(res => res.data)
}

export default {
    getClients,
    getClient,
    createClient,
    updateClient,
    deleteClient,
    getBrokers,
    createBroker,
    updateBroker,
    deleteBroker,
    getBrokerTopics,
    addBrokerTopic,
    updateBrokerTopic,
    getBrokerStatus,
    startBroker,
    stopBroker,
    suspendBroker,
    getJsonSchema,
    deleteBrokerTopic
}
