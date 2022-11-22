const { generateToken, sha256 } = require('../utils')
const { Op } = require('sequelize')

const DEFAULT_TOKEN_SESSION_EXPIRY = 1000 * 60 * 30 // 30 mins session - with refresh token support

module.exports = {
    /**
     * Create an AccessToken for the given project.
     * The token is hashed in the database. The only time the
     * true value is available is when it is returned from this function.
     */
    createTokenForProject: async function (app, project, expiresAt, scope = []) {
        const existingProjectToken = await project.getAccessToken()
        if (existingProjectToken) {
            await existingProjectToken.destroy()
        }
        const token = generateToken(32, 'fft')
        await app.db.models.AccessToken.create({
            token,
            expiresAt,
            scope,
            ownerId: project.id,
            ownerType: 'project'
        })
        return { token }
    },
    /**
     * Create an AccessToken for a user's password reset request
     */
    createTokenForPasswordReset: async function (app, user) {
        const token = generateToken(32, 'ffpr')
        const expiresAt = new Date(Date.now() + (86400 * 1000))
        await app.db.models.AccessToken.create({
            token,
            expiresAt,
            scope: 'password:reset',
            ownerId: user.hashid,
            ownerType: 'user'
        })
        return { token }
    },
    /**
     * Create an AccessToken for the given device.
     * The token is hashed in the database. The only time the
     * true value is available is when it is returned from this function.
     */
    createTokenForDevice: async function (app, device) {
        const existingDeviceToken = await device.getAccessToken()
        if (existingDeviceToken) {
            await existingDeviceToken.destroy()
        }
        const token = generateToken(32, 'ffd')
        await app.db.models.AccessToken.create({
            token,
            expiresAt: null,
            scope: 'device',
            ownerId: '' + device.id,
            ownerType: 'device'
        })
        return { token }
    },

    /**
     * Create an AccessToken for the editor.
     */
    createTokenForUser: async function (app, user, expiresAt, scope = [], includeRefresh) {
        const userId = typeof user === 'number' ? user : user.id
        const token = generateToken(32, 'ffu')
        const refreshToken = includeRefresh ? generateToken(32, 'ffu') : null
        if (refreshToken && !expiresAt) {
            expiresAt = Date.now() + DEFAULT_TOKEN_SESSION_EXPIRY
        }
        await app.db.models.AccessToken.create({
            token,
            refreshToken,
            expiresAt,
            scope,
            ownerId: '' + userId,
            ownerType: 'user'
        })
        return { token, expiresAt, refreshToken }
    },

    refreshToken: async function (app, refreshToken) {
        const existingToken = await app.db.models.AccessToken.byRefreshToken(refreshToken)
        if (existingToken) {
            const [prefix] = refreshToken.split('_')
            const tokenUpdates = {
                token: generateToken(32, prefix),
                refreshToken: generateToken(32, prefix),
                expiresAt: Date.now() + DEFAULT_TOKEN_SESSION_EXPIRY
            }
            await app.db.models.AccessToken.update(tokenUpdates, { where: { refreshToken: existingToken.refreshToken } })
            return tokenUpdates
        }
        return null
    },

    /**
     * Get a token by its id. If the session has expired, it is deleted
     * and nothing returned.
     */
    getOrExpire: async function (app, token) {
        let accessToken = await app.db.models.AccessToken.findOne({
            where: {
                token: sha256(token),
                scope: {
                    [Op.ne]: 'password:reset'
                }
            }
        })
        if (accessToken) {
            if (accessToken.expiresAt && accessToken.expiresAt.getTime() < Date.now()) {
                await accessToken.destroy()
                accessToken = null
            }
        }
        return accessToken
    },

    getOrExpirePasswordResetToken: async function (app, token) {
        let accessToken = await app.db.models.AccessToken.findOne({
            where: {
                token: sha256(token),
                scope: 'password:reset'
            }
        })
        if (accessToken) {
            if (accessToken.expiresAt && accessToken.expiresAt.getTime() < Date.now()) {
                await accessToken.destroy()
                accessToken = null
            }
        }
        return accessToken
    },

    destroyToken: async function (app, token) {
        const accessToken = await app.db.models.AccessToken.findOne({
            where: {
                token: sha256(token)
            }
        })
        if (accessToken) {
            await accessToken.destroy()
        }
    }
}
