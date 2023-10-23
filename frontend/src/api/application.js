import product from '../services/product.js'
import daysSince from '../utils/daysSince.js'
import elapsedTime from '../utils/elapsedTime.js'
import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

const createApplication = (options) => {
    return client.post('/api/v1/applications', options).then(res => {
        const props = {
            'application-name': options.name,
            'application-description': options.description,
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
 * @param {string} description New description for the application
 */
const updateApplication = (applicationId, name, description) => {
    return client.put(`/api/v1/applications/${applicationId}`, { name, description }).then(res => {
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
 * Get the audit log for an application
 * @param {string} applicationId
 * @param {object} params
 * @param {string} cursor
 * @param {string} limit
 */
const getApplicationAuditLog = async (applicationId, params, cursor, limit) => {
    const url = paginateUrl(`/api/v1/applications/${applicationId}/audit-log`, cursor, limit)
    return client.get(url, { params }).then(res => res.data)
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
const getApplicationDevices = async (applicationId, cursor, limit, query, extraParams = {}) => {
    const url = paginateUrl(`/api/v1/applications/${applicationId}/devices`, cursor, limit, query, extraParams)
    const res = await client.get(url)

    res.data.devices = res.data.devices.map((item) => {
        item.createdSince = daysSince(item.createdAt)
        item.updatedSince = daysSince(item.updatedAt)
        item.lastSeenSince = item.lastSeenAt ? elapsedTime(0, item.lastSeenMs) + ' ago' : ''
        return item
    })

    return res.data
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
 */
const getPipelines = async (applicationId) => {
    const result = await client.get(`/api/v1/applications/${applicationId}/pipelines`)
    const pipelines = result.data.pipelines

    return pipelines.map((pipeline) => {
        pipeline.stages = pipeline.stages.map((stage) => {
            // For now, in the UI, a pipeline stage can only have one instance/
            // In the backend, multiple instances per pipeline are supported
            // @see getPipelineStage in frontend Pipeline API
            stage.instance = stage.instances?.[0]
            if (!stage.instances) {
                stage.instances = []
            }

            // Again, the backend supports multiple devices per stage but the UI
            // only exposes connecting one
            stage.device = stage.devices?.[0]
            if (!stage.devices) {
                stage.devices = []
            }

            return stage
        })

        return pipeline
    })
}

/**
 * Return information about a single pipeline
 * API only implements collecting all pipelines, so we have to filter
 * @param {string} applicationId
 * @param {string} pipelineId
 */
const getPipeline = async (applicationId, pipelineId) => {
    const pipelines = await getPipelines(applicationId)
    return pipelines.find(pipeline => pipeline.id === pipelineId)
}

/**
 * @param {string} applicationId
 * @param {string} name
 */
const createPipeline = async (applicationId, name) => {
    const options = {
        name,
        applicationId
    }
    return client.post('/api/v1/pipelines', options)
        .then(res => {
            const props = {
                'pipeline-id': res.data.id,
                'created-at': res.data.createdAt
            }
            product.capture('$ff-pipeline-created', props, {
                application: applicationId
            })
            return res.data
        })
}

/**
 * @param {string} applicationId
 * @param {string} pipelineId
 */
const deletePipeline = async (applicationId, pipelineId) => {
    return client.delete(`/api/v1/pipelines/${pipelineId}`)
        .then(res => {
            const props = {
                'pipeline-id': pipelineId,
                'created-at': res.data.createdAt
            }
            product.capture('$ff-pipeline-deleted', props, {
                application: applicationId
            })
            return res.data
        })
}

/**
 * @param {string} applicationId
 * @param {object} pipeline
 */
const updatePipeline = async (applicationId, pipeline) => {
    const body = {
        pipeline: {
            name: pipeline.name
        }
    }
    return client.put(`/api/v1/pipelines/${pipeline.id}`, body)
        .then(res => {
            return res.data
        })
}

/**
 * Get a list of all snapshots for an application (includes device and instance snapshots)
 * @param {string} applicationId - The ID of application to get snapshots for
 * @param {string} cursor
 * @param {string} limit
 */
const getSnapshots = async (applicationId, cursor, limit, options) => {
    const extraParams = {}
    if (options?.deviceId) {
        extraParams.deviceId = options.deviceId
    }
    if (options?.instanceId) {
        extraParams.instanceId = options.instanceId
    }
    const url = paginateUrl(`/api/v1/applications/${applicationId}/snapshots`, cursor, limit, null, extraParams)
    const res = await client.get(url)

    res.data.snapshots = res.data.snapshots.map((item) => {
        item.createdSince = daysSince(item.createdAt)
        item.updatedSince = daysSince(item.updatedAt)
        return item
    })

    return res.data
}

export default {
    createApplication,
    updateApplication,
    deleteApplication,
    getSnapshots,
    getApplication,
    getApplicationAuditLog,
    getApplicationDevices,
    getApplicationInstances,
    getApplicationInstancesStatuses,
    getPipeline,
    getPipelines,
    createPipeline,
    deletePipeline,
    updatePipeline
}
