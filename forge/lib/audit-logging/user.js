// Audit Logging of user scoped events

let app

const { userLog } = require('../../db/controllers/AuditLog')
const { generateBody, triggerObject } = require('./formatters')

// account logging
const account = {
    async register (actionedBy, error, user) {
        await log('account.register', actionedBy, generateBody({ error, user }))
    },
    async logout (actionedBy, error) {
        await log('account.logout', actionedBy, generateBody({ error }))
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
    async updatePassword (actionedBy, error) {
        await log('user.update-password', actionedBy, generateBody({ error }))
    },
    /**
     * Log the update of a user by another user
     * @param {number|object} actionedBy A user object or a user id. NOTE: 0 will denote the "system", >0 denotes a user
     * @param {*} error An error to log (pass null if no error)
     * @param {import('./formatters').UpdatesCollection} updates An `UpdatesCollection` or array of `{key: string, old: any, new: any}`
     */
    async updateUser (actionedBy, error, updates) {
        await log('user.update-user', actionedBy, generateBody({ error, updates }))
    },
    invitations: {
        async acceptInvite (actionedBy, error) {
            await log('user.invitations.accept-invite', actionedBy, generateBody({ error }))
        },
        async deleteInvite (actionedBy, error) {
            await log('user.invitations.delete-invite', actionedBy, generateBody({ error }))
        }
    }
}

// users logging (affects other user)
const users = {
    async createUser (actionedBy, error, user) {
        await logUser('users.create-user', actionedBy, generateBody({ error, user }), user?.id)
    },
    async deleteUser (actionedBy, error, user) {
        await logUser('users.delete-user', actionedBy, generateBody({ error, user }), user?.id)
    },
    async autoTeamCreate (actionedBy, error, team, user) {
        await logUser('users.auto-create-team', actionedBy, generateBody({ error, team, user }), user?.id)
    },
    /**
     * Log the update of a user by another user
     * @param {number|object} actionedBy A user object or a user id. NOTE: 0 will denote the "system", >0 denotes a user
     * @param {*} error An error to log (pass null if no error)
     * @param {*} user The user object of affected user
     * @param {import('./formatters').UpdatesCollection} updates An `UpdatesCollection` or array of `{key: string, old: any, new: any}`
     */
    async updateUser (actionedBy, error, updates, user) {
        await logUser('users.update-user', actionedBy, generateBody({ error, updates, user }), user?.id)
    }
}

// log as operation on self
const log = async (event, actionedBy, body) => {
    const trigger = triggerObject(actionedBy)
    await userLog(app, trigger.id, event, body, trigger.id)
}
// log as operation on another entity
const logUser = async (event, actionedBy, body, entityId) => {
    const trigger = triggerObject(actionedBy)
    await userLog(app, trigger.id, event, body, entityId)
}

module.exports = {
    getLoggers (_app) {
        app = _app
        return {
            user,
            users,
            account
        }
    }
}
