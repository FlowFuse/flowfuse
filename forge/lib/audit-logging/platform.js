// Audit Logging of platform scoped events

let app
const { generateBody, triggerObject } = require('./formatters')

const platform = {
    settings: {
        /**
         * Log settings update
         * @param {number|object} actionedBy A user object or a user id. NOTE: 0 will denote the "system", >0 denotes a user
         * @param {import('./formatters').UpdatesCollection} updates An `UpdatesCollection` or array of `{key: string, old: any, new: any}`
         */
        async updated (actionedBy, error, updates) {
            await log('platform.settings.updated', actionedBy, generateBody({ error, updates }))
        }
    },
    stack: {
        async created (actionedBy, error, stack) {
            await log('platform.stack.created', actionedBy, generateBody({ error, stack }))
        },
        async deleted (actionedBy, error, stack) {
            await log('platform.stack.deleted', actionedBy, generateBody({ error, stack }))
        },
        async updated (actionedBy, error, stack, updates) {
            await log('platform.stack.updated', actionedBy, generateBody({ error, stack, updates }))
        }
    },
    projectType: {
        async created (actionedBy, error, projectType) {
            await log('platform.project-type.created', actionedBy, generateBody({ error, projectType }))
        },
        async deleted (actionedBy, error, projectType) {
            await log('platform.project-type.deleted', actionedBy, generateBody({ error, projectType }))
        },
        async updated (actionedBy, error, projectType, updates) {
            await log('platform.project-type.updated', actionedBy, generateBody({ error, projectType, updates }))
        }
    },
    license: {
        async applied (actionedBy, error, license) {
            await log('platform.license.applied', actionedBy, generateBody({ error, license }))
        },
        async inspected (actionedBy, error, license) {
            await log('platform.license.inspected', actionedBy, generateBody({ error, license }))
        }
    }
}

const log = async (event, actionedBy, body) => {
    const trigger = triggerObject(actionedBy)
    await app.db.controllers.AuditLog.platformLog(trigger.id, event, body)
}

module.exports = {
    getLoggers (_app) {
        app = _app
        return {
            platform
        }
    }
}
