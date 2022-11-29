const { generateBody, triggerObject } = require('./formatters')
// Audit Logging of user scoped events

module.exports = {
    getLoggers (app) {
        // account logging
        const account = {
            async register (actionedBy, error, user) {
                await log('account.register', actionedBy, generateBody({ error, user }))
            },
            async logout (actionedBy, error, user) {
                await log('account.logout', actionedBy, generateBody({ error, user }))
            },
            async login (actionedBy, error, user) {
                await log('account.login', actionedBy, generateBody({ error, user: (error ? user : null) }))
            },
            async forgotPassword (actionedBy, error, user) {
                await log('account.forgot-password', actionedBy, generateBody({ error, user }))
            },
            async resetPassword (actionedBy, error, user) {
                await log('account.reset-password', actionedBy, generateBody({ error, user }))
            },
            verify: {
                async autoCreateTeam (actionedBy, error, team) {
                    await log('account.verify.auto-create-team', actionedBy, generateBody({ error, team }))
                },
                async requestToken (actionedBy, error) {
                    await log('account.verify.request-token', actionedBy, generateBody({ error }))
                },
                async verifyToken (actionedBy, error) {
                    await log('account.verify.verify-token', actionedBy, generateBody({ error }))
                }
            }
        }

        // user logging (operations on self)
        const user = {
            async updatedPassword (actionedBy, error) {
                await log('user.updated-password', actionedBy, generateBody({ error }))
            },
            /**
             * Log the update of a user by another user
             * @param {number|object} actionedBy A user object or a user id. NOTE: 0 will denote the "system", >0 denotes a user
             * @param {*} error An error to log (pass null if no error)
             * @param {import('./formatters').UpdatesCollection} updates An `UpdatesCollection` or array of `{key: string, old: any, new: any}`
             */
            async updatedUser (actionedBy, error, updates) {
                await log('user.updated-user', actionedBy, generateBody({ error, updates }))
            },
            invitation: {
                async accepted (actionedBy, error) {
                    await log('user.invitation.accepted', actionedBy, generateBody({ error }))
                },
                async deleted (actionedBy, error) {
                    await log('user.invitation.deleted', actionedBy, generateBody({ error }))
                }
            }
        }

        // users logging (affects other user)
        const users = {
            async userCreated (actionedBy, error, user) {
                await logUser('users.created-user', actionedBy, generateBody({ error, user }), user?.id)
            },
            async userDeleted (actionedBy, error, user) {
                await logUser('users.deleted-user', actionedBy, generateBody({ error, user }), user?.id)
            },
            async teamAutoCreated (actionedBy, error, team, user) {
                await logUser('users.auto-created-team', actionedBy, generateBody({ error, team, user }), user?.id)
            },
            /**
             * Log the update of a user by another user
             * @param {number|object} actionedBy A user object or a user id. NOTE: 0 will denote the "system", >0 denotes a user
             * @param {*} error An error to log (pass null if no error)
             * @param {*} user The user object of affected user
             * @param {import('./formatters').UpdatesCollection} updates An `UpdatesCollection` or array of `{key: string, old: any, new: any}`
             */
            async updatedUser (actionedBy, error, updates, user) {
                await logUser('users.updated-user', actionedBy, generateBody({ error, updates, user }), user?.id)
            }
        }

        // log as operation on self
        const log = async (event, actionedBy, body) => {
            try {
                const trigger = triggerObject(actionedBy)
                let whoDidIt = trigger?.id
                if (typeof whoDidIt !== 'number' || whoDidIt <= 0) {
                    whoDidIt = null
                    body.trigger = trigger
                }
                await app.db.controllers.AuditLog.userLog(whoDidIt, event, body, whoDidIt)
            } catch (error) {
                console.warn('Failed to log user scope audit event', event, error)
            }
        }
        // log as operation on another entity
        const logUser = async (event, actionedBy, body, entityId) => {
            try {
                const trigger = triggerObject(actionedBy)
                let whoDidIt = trigger?.id
                if (typeof whoDidIt !== 'number' || whoDidIt <= 0) {
                    whoDidIt = null
                    body.trigger = trigger
                }
                await app.db.controllers.AuditLog.userLog(whoDidIt, event, body, entityId)
            } catch (error) {
                console.warn('Failed to log users scope audit event', event, error)
            }
        }
        return {
            user,
            users,
            account
        }
    }
}
