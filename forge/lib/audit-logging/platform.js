// Audit Logging of platform scoped events

let app

const { platformLog } = require('../../db/controllers/AuditLog')
const { generateBody, triggerObject } = require('./formatters')

const platform = {
    settings: {
        /**
         * Log settings update
         * @param {number|object} actionedBy A user object or a user id. NOTE: 0 will denote the "system", >0 denotes a user
         * @param {import('./formatters').UpdatesCollection} updates An `UpdatesCollection` or array of `{key: string, old: any, new: any}`
         */
        async update (actionedBy, error, updates) {
            await log('platform.settings.update', actionedBy, generateBody({ error, updates }))
        }
    },
    stack: {
        async create (actionedBy, error, stack) {
            await log('platform.stack.create', actionedBy, generateBody({ error, stack }))
        },
        async delete (actionedBy, error, stack) {
            await log('platform.stack.delete', actionedBy, generateBody({ error, stack }))
        },
        async update (actionedBy, error, stack, updates) {
            await log('platform.stack.update', actionedBy, generateBody({ error, stack, updates }))
        }
    },
    projectType: {
        async create (actionedBy, error, projectType) {
            await log('platform.projectType.create', actionedBy, generateBody({ error, projectType }))
        },
        async delete (actionedBy, error, projectType) {
            await log('platform.projectType.delete', actionedBy, generateBody({ error, projectType }))
        },
        async update (actionedBy, error, projectType, updates) {
            await log('platform.projectType.update', actionedBy, generateBody({ error, projectType, updates }))
        }
    },
    license: {
        async apply (actionedBy, error, license) {
            await log('platform.license.apply', actionedBy, generateBody({ error, license }))
        },
        async inspect (actionedBy, error, license) {
            await log('platform.license.inspect', actionedBy, generateBody({ error, license }))
        }
    }
}

const log = async (event, actionedBy, body) => {
    const trigger = triggerObject(actionedBy)
    await platformLog(app, trigger.id, event, body)
}

module.exports = {
    getLoggers (_app) {
        app = _app
        return {
            platform
        }
    }
}
