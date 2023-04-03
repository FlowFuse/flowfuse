import client from './client'

import daysSince from '../utils/daysSince'

const createApplication = (options) => {
    return client.post('/api/v1/applications', options).then(res => {
        return res.data
    })
}

/**
 * @param {string} applicationId
 * @param {string} name New name for the application
 */
const updateApplication = (applicationId, name) => {
    return client.put(`/api/v1/applications/${applicationId}`, { name }).then(res => {
        return res.data
    })
}

/**
 * @param {string} applicationId
 */
const deleteApplication = (applicationId) => {
    return client.delete(`/api/v1/applications/${applicationId}`)
}

/**
 * @param {string} applicationId
 */
const getApplication = (applicationId) => {
    return client.get(`/api/v1/applications/${applicationId}`).then(res => {
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        return res.data
    })
}

/**
 * @param {string} applicationId
 * @param {string} cursor
 * @param {string} limit
 */
const getApplicationInstances = async (applicationId, cursor, limit) => {
    const result = await client.get(`/api/v1/applications/${applicationId}/instances`)

    const instances = result.data.instances.map((instance) => {
        instance.createdSince = daysSince(instance.createdAt)
        instance.updatedSince = daysSince(instance.updatedAt)
        return instance
    })

    return instances
}

/**
 * @param {string} applicationId
 * @param {string} cursor
 * @param {string} limit
 */
const getApplicationInstancesStatuses = async (applicationId, cursor, limit) => {
    const result = await client.get(`/api/v1/applications/${applicationId}/instances/status`)

    const instances = result.data.instances.map((instance) => {
        instance.flowLastUpdatedSince = daysSince(instance.flowLastUpdatedAt)
        return instance
    })

    return instances
}

export default {
    createApplication,
    updateApplication,
    deleteApplication,
    getApplication,
    getApplicationInstances,
    getApplicationInstancesStatuses
}
