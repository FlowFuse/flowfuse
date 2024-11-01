import product from '../services/product.js'

import daysSince from '../utils/daysSince.js'
import elapsedTime from '../utils/elapsedTime.js'
import { RoleNames, Roles } from '../utils/roles.js'

import client from './client.js'

const login = (username, password) => {
    return client.post('/account/login', {
        username,
        password
    }).then((res) => {
        return res.data
    })
}

const verifyMFAToken = (token) => {
    return client.post('/account/login/token', {
        token
    }).then((res) => {
        product.capture('$ff-user-verified')
        return res.data
    })
}

const logout = () => {
    return client.post('/account/logout').then((res) => {
        try {
            window.posthog?.reset()
        } catch (err) {
            console.error('posthog error resetting user data')
        }
        return res.data
    })
}

const registerUser = async (options) => {
    return client.post('/account/register', options).then((res) => {
        const person = {
            name: options.name,
            username: options.username,
            email: options.email,
            'ff-cloud-user': true,
            'ff-cloud-joined': (new Date()).toUTCString(),
            'join-reason': options.join_reason
        }
        product.identify(options.username, person)
        product.capture('$ff-user-registered')
        return res.data
    })
}

const getUser = () => {
    return client.get('/api/v1/user/').then((res) => {
        product.identify(res.data.username, {
            name: res.data.name,
            username: res.data.username,
            email: res.data.email,
            'ff-cloud-user': true
        })
        return res.data
    })
}

const changePassword = (oldPassword, password) => {
    return client.put('/api/v1/user/change_password', {
        old_password: oldPassword,
        password
    }).then(res => res.data)
}

const updateUser = async (options) => {
    return client.put('/api/v1/user', options).then(res => {
        return res.data
    })
}
const deleteUser = async () => {
    return client.delete('/api/v1/user').then(res => {
        return res.data
    })
}
const getNotifications = async () => {
    return client.get('/api/v1/user/notifications').then(res => {
        res.data.invitations = res.data.notifications.map(r => {
            r.createdSince = daysSince(r.createdAt)
            return r
        })
        return res.data
    })
}
const markNotificationRead = async (id) => {
    return client.put('/api/v1/user/notifications/' + id, {
        read: true
    })
}
const markNotificationsBulk = async (ids, data = { read: true }) => {
    return client.put('/api/v1/user/notifications/', {
        ids,
        ...data
    }).then(res => {
        res.data.notifications = res.data.notifications.map(n => {
            n.createdSince = daysSince(n.createdAt)
            return n
        })
        return res.data
    })
}
const getTeamInvitations = async () => {
    return client.get('/api/v1/user/invitations').then(res => {
        res.data.invitations = res.data.invitations.map(r => {
            r.createdSince = daysSince(r.createdAt)
            r.expires = elapsedTime(r.expiresAt, Date.now())
            r.roleName = RoleNames[r.role || Roles.Member]
            return r
        })
        return res.data
    })
}
const acceptTeamInvitation = async (invitationId, teamId) => {
    return client.patch('/api/v1/user/invitations/' + invitationId).then(res => {
        return res.data
    })
}

const rejectTeamInvitation = async (invitationId, teamId) => {
    return client.delete('/api/v1/user/invitations/' + invitationId).then(res => {
        product.capture('$ff-invite-rejected', {
            'invite-id': invitationId,
            'rejected-at': (new Date()).toISOString()
        }, {
            team: teamId
        })
        return res.data
    })
}
/**
 * Helper function to call runtime API to send a new account verification email
 * @returns {Promise}
 */
const triggerVerification = async () => {
    return client.post('/account/verify').then(res => {
        return res.data
    })
}
/**
 * Helper function to call 'account' 'verify' API
 * @param {string} token The token provided in the users email
 * @returns {Promise}
 */
const verifyEmailToken = async (token) => {
    return client.post('/account/verify/token', {
        token
    }).then(res => {
        return res.data
    })
}
/**
 * Helper function to call runtime API to send a new pending email
 * address change verification email
 * @param {string} newEmailAddress The new email address
 * @returns {Promise}
 */
const triggerPendingEmailChangeVerification = async (newEmailAddress) => {
    return client.post('/account/email_change', newEmailAddress).then(res => {
        return res.data
    })
}
/**
 * Helper function to call 'account' 'email_change' API
 * @param {string} token The token provided in the users email
 * @returns {Promise}
 */
const verifyPendingEmailChangeToken = async (token) => {
    return client.post(`/account/email_change/${token}`).then(res => {
        return res.data
    })
}
/**
 * Helper function to request password reset.
 * See [routes/api/account.js](../../../forge/routes/auth/index.js)
 * @param {string} email The users email address
 * @returns {Promise}
 */
const requestPasswordReset = async (email) => {
    return client.post('/account/forgot_password', email).then(res => res.data)
}
/**
 * Helper function to perform password reset.
 * See [routes/api/account.js](../../../forge/routes/auth/index.js)
 * @param {string} token The reset token
 * @param {string} password The new password
 */
const resetPassword = async (token, password) => {
    return client.post(`/account/reset_password/${token}`, password).then(res => res.data)
}

/**
 * Get a User's Personal Access Tokens
 * See [routes/api/user.js](../../../forge/routes/api/user.js)
 */
const getPersonalAccessTokens = async () => {
    return client.get('/api/v1/user/tokens').then(res => res.data)
}

/**
 * Create new User Personal Access Token
 * See [routes/api/user.js](../../../forge/routes/api/user.js)
 * @param {string} name
 * @param {string} scope
 * @param {number} expiresAt
 */
const createPersonalAccessToken = async (name, scope, expiresAt) => {
    return client.post('/api/v1/user/tokens', { name, scope, expiresAt }).then(res => res.data)
}

/**
 * Delete User Personal Access Token
 * See [routes/api/user.js](../../../forge/routes/api/user.js)
 * @param {string} id
 */
const deletePersonalAccessToken = async (id) => {
    return client.delete('/api/v1/user/tokens/' + id).then(res => {})
}

/**
 * Update User Personal Token
 */
const updatePersonalAccessToken = async (id, scope, expiresAt) => {
    return client.put('/api/v1/user/tokens/' + id, { scope, expiresAt })
}

const enableMFA = async () => {
    return client.put('/api/v1/user/mfa', {}).then(res => res.data)
}
const disableMFA = async () => {
    return client.delete('/api/v1/user/mfa').then(res => res.data)
}
const verifyMFA = async (token) => {
    return client.put('/api/v1/user/mfa/verify', { token }).then(res => res.data)
}

export default {
    registerUser,
    getUser,
    login,
    verifyMFAToken,
    logout,
    changePassword,
    updateUser,
    deleteUser,
    getNotifications,
    markNotificationRead,
    markNotificationsBulk,
    getTeamInvitations,
    acceptTeamInvitation,
    rejectTeamInvitation,
    triggerVerification,
    verifyEmailToken,
    requestPasswordReset,
    resetPassword,
    verifyPendingEmailChangeToken,
    triggerPendingEmailChangeVerification,
    getPersonalAccessTokens,
    createPersonalAccessToken,
    deletePersonalAccessToken,
    updatePersonalAccessToken,
    enableMFA,
    verifyMFA,
    disableMFA
}
