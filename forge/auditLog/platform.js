const { generateBody, triggerObject } = require('./formatters')
// Audit Logging of platform scoped events

module.exports = {
    getLoggers (app) {
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
                },
                /**
                * Log the update of an overage by a resource
                * @param {number|object|'system'} actionedBy A user object or a user id. NOTE: 0 will denote the "system", >0 denotes a user
                * @param {*} error An error to log (pass null if no error)
                * @param {Object} options
                * @param {'users'|'teams'|'projects'|'devices'} options.resource The resource that has overage
                * @param {number} options.count The current count of the resource
                * @param {number} options.limit The limit of the resource
                */
                async overage (actionedBy, error, { resource, count, limit } = {}) {
                    ['users', 'teams', 'projects', 'devices'].includes(resource) || (resource = resource || 'unknown')
                    const info = { resource, count, limit }
                    await log('platform.license.overage', actionedBy, generateBody({ error, info }))
                }
            }
        }

        const log = async (event, actionedBy, body) => {
            try {
                const trigger = triggerObject(actionedBy)
                let whoDidIt = trigger?.id
                if (typeof whoDidIt !== 'number' || whoDidIt <= 0) {
                    whoDidIt = null
                    body.trigger = trigger
                }
                await app.db.controllers.AuditLog.platformLog(whoDidIt, event, body)
            } catch (error) {
                console.warn('Failed to log platform scope audit event', event, error)
            }
        }
        return {
            platform
        }
    }
}
