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
                    async deviceTargetSet (actionedBy, error, application, device, snapshot) {
                        await log('application.device.snapshot.device-target-set', actionedBy, application?.id, generateBody({ error, device, snapshot }))
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
