const axios = require('axios')
const { Op } = require('sequelize')

const ProjectSettings = require('../../db/models/ProjectSettings')
const ProjectTemplate = require('../../db/models/ProjectTemplate')

const { randomInt } = require('../utils')

const SCOPE_CERTIFIED = '@flowfuse-certified-nodes/' // TODO change to certified nodes scope, maybe should be configurable
const SCOPE_NODES = '@flowfuse-nodes/'
const PING_TIME = `${randomInt(0, 59)} ${randomInt(0, 2)} * * *`
const CERTIFIED_NODES_ENDPOINT = 'https://ff-certified-nodes.flowfuse.cloud/certified-nodes' // configurable?

async function collect (app) {
    const payload = {
        instanceId: app.settings.get('instanceId'),
        certifiedNodes: {}
    }
    const snapshots = {}
    // checking certified nodes enabled and active
    const npmRegURLString = app.settings.get('platform:certifiedNodes:npmRegistryURL')
    const token = app.settings.get('platform:certifiedNodes:token')
    const catalogueString = app.settings.get('platform:certifiedNodes:catalogueURL')
    if (app.config.features.enabled('certifiedNodes') && (npmRegURLString && token && catalogueString)) {
        try {
            const runningProjects = await app.db.models.Project.findAll({
                where: {
                    state: 'running'
                },
                include: [
                    {
                        model: ProjectTemplate.model
                    },
                    {
                        model: ProjectSettings.model,
                        where: { key: ProjectSettings.KEY_SETTINGS }
                    }
                ]
            })

            // uses getRuntimeSettings to include template merge
            for (const project of runningProjects) {
                const settings = await app.db.controllers.Project.getRuntimeSettings(project)
                if (settings.palette?.modules) {
                    for (const mod of Object.keys(settings.palette.modules)) {
                        if (mod.startsWith(SCOPE_CERTIFIED) || mod.startsWith(SCOPE_NODES)) {
                            if (payload.certifiedNodes[mod]) {
                                payload.certifiedNodes[mod]++
                            } else {
                                payload.certifiedNodes[mod] = 1
                            }
                        }
                    }
                }
            }

            // all running devices seen in the last 24hrs
            const now = Date.now()
            const runningDevices = await app.db.models.Device.findAll({
                where: {
                    state: 'running',
                    lastSeenAt: { [Op.gte]: new Date(now - 1000 * 60 * 60 * 24) }
                }
            })
            for (const dev of runningDevices) {
                const activeSnapshot = dev.activeSnapshotId
                if (activeSnapshot !== undefined) {
                    if (snapshots[activeSnapshot]) {
                        const cache = snapshots[activeSnapshot]
                        for (const mod of cache) {
                            if (payload.certifiedNodes[mod]) {
                                payload.certifiedNodes[mod]++
                            } else {
                                payload.certifiedNodes[mod] = 1
                            }
                        }
                    } else {
                        const snapshot = await app.db.models.ProjectSnapshot.byId(activeSnapshot)
                        if (snapshot.settings.modules) {
                            const cache = []
                            for (const mod of Object.keys(snapshot.settings.modules)) {
                                if (mod.startsWith(SCOPE_CERTIFIED) || mod.startsWith(SCOPE_NODES)) {
                                    cache.push(mod)
                                    if (payload.certifiedNodes[mod]) {
                                        payload.certifiedNodes[mod]++
                                    } else {
                                        payload.certifiedNodes[mod] = 1
                                    }
                                }
                            }
                            snapshots[activeSnapshot] = cache
                        }
                    }
                }
            }
        } catch (err) {
            app.log.error('Failed to gather Certified Nodes usage', err)
        }

        // decide where to send response
        try {
            await axios.post(CERTIFIED_NODES_ENDPOINT, payload)
        } catch (err) {
            app.log.error('Failed to upload Certified Nodes usage', err)
        }
    } else {
        // console.log('NOT ACTIVE')
        // console.log(catalogueString, npmRegURLString, token)
    }
}

module.exports = {
    name: 'certifiedNodes',
    startup: false,
    schedule: PING_TIME,
    run: async function (app) {
        return collect(app)
    }
}
