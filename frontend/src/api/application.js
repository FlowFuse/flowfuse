
import product from '../services/product.js'
import daysSince from '../utils/daysSince.js'

import client from './client.js'

const createApplication = (options) => {
    return client.post('/api/v1/applications', options).then(res => {
        const props = {
            'application-name': options.name,
            'created-at': res.data.createdAt
        }
        product.capture('$ff-application-created', props, {
            team: options.teamId,
            application: res.data.id
        })
        product.groupUpdate('application', res.data.id, props)
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
const deleteApplication = (applicationId, teamId) => {
    return client.delete(`/api/v1/applications/${applicationId}`).then(() => {
        const timestamp = (new Date()).toISOString()
        product.capture('$ff-application-deleted', {
            'deleted-at': timestamp
        }, {
            team: teamId,
            application: applicationId
        })
        product.groupUpdate('application', applicationId, {
            deleted: true,
            'deleted-at': timestamp
        })
    })
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

/**
 * @param {string} applicationId
 * @param {string} cursor
 * @param {string} limit
 */
const getPipelines = async (applicationId, cursor, limit) => {
    const result = await client.get(`/api/v1/applications/${applicationId}/pipelines`)
    console.log('result')
    console.log(result)
    const instances = result.data.pipelines

    return instances
}

/**
 * @param {string} applicationId
 * @param {string} cursor
 * @param {string} limit
 */
const createPipeline = async (applicationId, name, cursor, limit) => {
    const options = {
        name
    }
    return client.post(`/api/v1/applications/${applicationId}/pipelines`, options)
        .then(res => {
            const props = {
                'application-name': options.name,
                'created-at': res.data.createdAt
            }
            product.capture('$ff-pipeline-created', props, {
                team: options.teamId,
                application: res.data.id
            })
            return res.data
        })
}

export default {
    createApplication,
    updateApplication,
    deleteApplication,
    getApplication,
    getApplicationInstances,
    getApplicationInstancesStatuses,
    getPipelines,
    createPipeline
}
