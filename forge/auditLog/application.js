const { generateBody, triggerObject } = require('./formatters')

// Audit Logging of application scoped events
module.exports = {
    getLoggers (app) {
        const application = {
            async created (actionedBy, error, team, application) {
                await log('application.created', actionedBy, application?.id, generateBody({ error, team, application }))
            },
            async deleted (actionedBy, error, team, application) {
                await log('application.deleted', actionedBy, application?.id, generateBody({ error, team, application }))
            },
            async updated (actionedBy, error, team, application, updates) {
                const body = generateBody({ error, team, application, updates })
                await log('application.update', actionedBy, application?.id, body)
            }
        }

        const log = async (event, actionedBy, projectId, body) => {
            try {
                const trigger = triggerObject(actionedBy)
                let whoDidIt = trigger.id
                if (typeof trigger.id !== 'number' || trigger.id <= 0) {
                    whoDidIt = null
                    body.trigger = trigger
                }
                await app.db.controllers.AuditLog.applicationLog(projectId, whoDidIt, event, body)
            } catch (error) {
                console.warn('Failed to log project scope audit event', event, error)
            }
        }
        return {
            application
        }
    }
}
