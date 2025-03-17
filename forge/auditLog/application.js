const { generateBody, triggerObject } = require('./formatters')
// Audit Logging of application scoped events

module.exports = {
    getLoggers (app) {
        /**
         * @name ApplicationAuditLog
         * @alias ApplicationAuditLog
         * @namespace
         */
        const application = {
            async created (actionedBy, error, application) {
                await log('application.created', actionedBy, application?.id, generateBody({ error, application }))
            },
            async updated (actionedBy, error, application, updates) {
                await log('application.updated', actionedBy, application?.id, generateBody({ error, application, updates }))
            },
            device: {
                async unassigned (actionedBy, error, application, device) {
                    await log('application.device.unassigned', actionedBy, application?.id, generateBody({ error, application, device }))
                },
                async assigned (actionedBy, error, application, device) {
                    await log('application.device.assigned', actionedBy, application?.id, generateBody({ error, application, device }))
                },
                snapshot: {
                    async created (actionedBy, error, application, device, snapshot) {
                        await log('application.device.snapshot.created', actionedBy, application?.id, generateBody({ error, device, snapshot }))
                    },
                    async updated (actionedBy, error, application, device, snapshot, updates) {
                        await log('application.device.snapshot.updated', actionedBy, application?.id, generateBody({ error, device, snapshot, updates }))
                    },
                    async deleted (actionedBy, error, application, device, snapshot) {
                        await log('application.device.snapshot.deleted', actionedBy, application?.id, generateBody({ error, device, snapshot }))
                    },
                    async exported (actionedBy, error, application, device, snapshot) {
                        await log('application.device.snapshot.exported', actionedBy, application?.id, generateBody({ error, device, snapshot }))
                    },
                    async imported (actionedBy, error, application, device, sourceProject, sourceDevice, snapshot) {
                        await log('application.device.snapshot.imported', actionedBy, application?.id, generateBody({ error, device, sourceProject, sourceDevice, snapshot }))
                    },
                    async deviceTargetSet (actionedBy, error, application, device, snapshot) {
                        await log('application.device.snapshot.device-target-set', actionedBy, application?.id, generateBody({ error, device, snapshot }))
                    }
                }
            },
            deviceGroup: {
                async created (actionedBy, error, application, deviceGroup) {
                    await log('application.deviceGroup.created', actionedBy, application?.id, generateBody({ error, application, deviceGroup }))
                },
                async updated (actionedBy, error, application, deviceGroup, updates) {
                    await log('application.deviceGroup.updated', actionedBy, application?.id, generateBody({ error, application, deviceGroup, updates }))
                },
                async deleted (actionedBy, error, application, deviceGroup) {
                    await log('application.deviceGroup.deleted', actionedBy, application?.id, generateBody({ error, application, deviceGroup }))
                },
                async membersChanged (actionedBy, error, application, deviceGroup, updates, info) {
                    await log('application.deviceGroup.members.changed', actionedBy, application?.id, generateBody({ error, application, deviceGroup, updates, info }))
                },
                settings: {
                    async updated (actionedBy, error, application, deviceGroup, updates) {
                        await log('application.deviceGroup.settings.updated', actionedBy, application?.id, generateBody({ error, application, deviceGroup, updates }))
                    }
                }
            }
        }

        const log = async (event, actionedBy, applicationId, body) => {
            try {
                const trigger = triggerObject(actionedBy)
                let whoDidIt = trigger.id
                if (typeof trigger.id !== 'number' || trigger.id <= 0) {
                    whoDidIt = null
                    body.trigger = trigger
                }
                await app.db.controllers.AuditLog.applicationLog(applicationId, whoDidIt, event, body)
            } catch (error) {
                console.warn('Failed to log application scope audit event', event, error)
            }
        }
        return {
            application
        }
    }
}
