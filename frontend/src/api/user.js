import client from './client'
import daysSince from '@/utils/daysSince'
import elapsedTime from '@/utils/elapsedTime'
import { RoleNames, Roles } from '@core/lib/roles'

const login = (username, password) => {
    return client.post('/account/login', {
        username,
        password
    }).then((res) => {
        return res.data
    })
}
const logout = () => {
    return client.post('/account/logout').then((res) => {
        window.posthog?.reset()
        return res.data
    })
}

const registerUser = async (options) => {
    return client.post('/account/register', options).then(res => res.data)
}

const getUser = () => {
    return client.get('/api/v1/user/').then((res) => {
        window.posthog?.identify(res.data.username, {
            name: res.data.name,
            username: res.data.username
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
const acceptTeamInvitation = async (invitationId) => {
    return client.patch('/api/v1/user/invitations/' + invitationId).then(res => {
        return res.data
    })
}

const rejectTeamInvitation = async (invitationId) => {
    return client.delete('/api/v1/user/invitations/' + invitationId).then(res => {
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
    return client.post(`/account/verify/${token}`).then(res => {
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
export default {
    registerUser,
    getUser,
    login,
    logout,
    changePassword,
    updateUser,
    getTeamInvitations,
    acceptTeamInvitation,
    rejectTeamInvitation,
    triggerVerification,
    verifyEmailToken,
    requestPasswordReset,
    resetPassword
}
