const { triggerObject, generateBody } = require('./formatters')

// Audit Logging of device scoped events
module.exports = {
    getLoggers (app) {
        const device = {
            async assigned (actionedBy, error, projectOrApplication, device) {
                const bodyData = { error, device }
                if (device.isApplicationOwned || projectOrApplication?.constructor?.name === 'Application') {
                    bodyData.application = projectOrApplication
                } else {
                    bodyData.project = projectOrApplication
                }
                await log('device.assigned', actionedBy, device.id, generateBody(bodyData))
            },
            async unassigned (actionedBy, error, projectOrApplication, device) {
                const bodyData = { error, device }
                if (device.isApplicationOwned || projectOrApplication?.constructor?.name === 'Application') {
                    bodyData.application = projectOrApplication
                } else {
                    bodyData.project = projectOrApplication
                }
                await log('device.unassigned', actionedBy, device.id, generateBody(bodyData))
            },
            async started (actionedBy, error, device) {
                await log('device.started', actionedBy, device?.id, generateBody({ error, device }))
            },
            async restarted (actionedBy, error, device) {
                await log('device.restarted', actionedBy, device?.id, generateBody({ error, device }))
            },
            async suspended (actionedBy, error, device) {
                await log('device.suspended', actionedBy, device?.id, generateBody({ error, device }))
            },
            async startFailed (actionedBy, error, device) {
                await log('device.start-failed', actionedBy || 0, device?.id, generateBody({ error, device }))
            },
            async restartFailed (actionedBy, error, device) {
                await log('device.restart-failed', actionedBy || 0, device?.id, generateBody({ error, device }))
            },
            async suspendFailed (actionedBy, error, device) {
                await log('device.suspend-failed', actionedBy || 0, device?.id, generateBody({ error, device }))
            },
            pipeline: {
                async deployed (actionedBy, error, device, pipeline, application, snapshot) {
                    await log('device.pipeline.deployed', actionedBy, device?.id, generateBody({
                        device,
                        error,
                        snapshot,
                        application,
                        pipeline
                    }))
                }
            },
            project: {
                async deployed (actionedBy, error, device, project, snapshot) {
                    await log('device.project.deployed', actionedBy, device?.id, generateBody({
                        device,
                        error,
                        snapshot,
                        project
                    }))
                }
            },
            credentials: {
                async generated (actionedBy, error, device) {
                    await log('device.credential.generated', actionedBy, device?.id, generateBody({ error, device }))
                }
            },
            developerMode: {
                async enabled (actionedBy, error, device) {
                    await log('device.developer-mode.enabled', actionedBy, device?.id, generateBody({ error, device }))
                },
                async disabled (actionedBy, error, device) {
                    await log('device.developer-mode.disabled', actionedBy, device?.id, generateBody({ error, device }))
                }
            },
            remoteAccess: {
                async enabled (actionedBy, error, device) {
                    await log('device.remote-access.enabled', actionedBy, device?.id, generateBody({ error, device }))
                },
                async disabled (actionedBy, error, device) {
                    await log('device.remote-access.disabled', actionedBy, device?.id, generateBody({ error, device }))
                }
            },
            settings: {
                async updated (actionedBy, error, device, updates) {
                    await log('device.settings.updated', actionedBy, device?.id, generateBody({ error, device, updates }))
                }
            },
            snapshot: {
                async deployed (actionedBy, error, device, snapshot) {
                    await log('device.snapshot.deployed', actionedBy, device?.id, generateBody({
                        device,
                        error,
                        snapshot,
                        user: actionedBy
                    }))
                },
                async created (actionedBy, error, device, snapshot) {
                    await log('device.snapshot.created', actionedBy, device.id, generateBody({
                        error,
                        device,
                        snapshot
                    }))
                },

                async targetSet (actionedBy, error, device, snapshot) {
                    await log('device.snapshot.target-set', actionedBy, device?.id, generateBody({ error, device, snapshot }))
                }
            }
        }

        const log = async (event, actionedBy, deviceId, body) => {
            try {
                const trigger = triggerObject(actionedBy)
                let whoDidIt = trigger?.id
                if (typeof whoDidIt !== 'number' || whoDidIt <= 0) {
                    whoDidIt = null
                    body.trigger = trigger
                }
                await app.db.controllers.AuditLog.deviceLog(deviceId, whoDidIt, event, body)
            } catch (error) {
                console.warn('Failed to log device scope audit event', event, error)
            }
        }
        return {
            device
            // snapshot
        }
    }
}
