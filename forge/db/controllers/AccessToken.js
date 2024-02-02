const { Op } = require('sequelize')

const { generateToken, sha256, randomPhrase } = require('../utils')

const DEFAULT_TOKEN_SESSION_EXPIRY = 1000 * 60 * 30 // 30 mins session - with refresh token support

const DEFAULT_DEVICE_OTC_EXPIRY = 1000 * 60 * 60 * 24 // 24 hours

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
        // Ensure any existing tokens are removed first
        await app.db.controllers.AccessToken.deleteAllUserPasswordResetTokens(user)

        const token = generateToken(32, 'ffpr')
        const expiresAt = new Date(Date.now() + (86400 * 1000)) // 1 day
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
     * Deletes any pending password-change tokens for a user.
     */
    deleteAllUserPasswordResetTokens: async function (app, user) {
        await app.db.models.AccessToken.destroy({
            where: {
                ownerType: 'user',
                scope: 'password:reset',
                ownerId: user.hashid
            }
        })
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

    createDeviceOTC: async function (app, device) {
        const existing = await app.db.models.AccessToken.findOne({
            where: {
                ownerId: '' + device.id,
                ownerType: 'device',
                scope: 'device:otc'
            }
        })
        if (existing) {
            await existing.destroy()
        }
        const otc = randomPhrase(3, 2, 15, '-') // 3 words, min 2 chars, max 15 chars, separated by '-'
        const token = Buffer.from(otc).toString('base64')
        const data = {
            token,
            expiresAt: Date.now() + DEFAULT_DEVICE_OTC_EXPIRY,
            scope: 'device:otc',
            ownerId: '' + device.id,
            ownerType: 'device'
        }
        await app.db.models.AccessToken.create(data)
        return { otc }
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

    /**
     * Create a (restricted) auto device provisioning token (adp) for the given team.
     * The token is hashed in the database. The only time the
     * true value is available is when it is returned from this function.
     * @param {Object} app - The app object
     * @param {string} name - A name for this token
     * @param {Object|number} team - The team object or id
     * @param {Object|string} project - The project object or id
     * @param {Date|'never'} [expiresAt] - The expiry date. If `undefined`, the token never expires
     */
    createTokenForTeamDeviceProvisioning: async function (app, name, team, project, expiresAt) {
        const generatedToken = generateToken(32, 'ffadp')
        const scope = ['device:provision', `name:${name}`]
        const projectId = (project && typeof project === 'object') ? project.id : project
        const teamId = (team && typeof team === 'object') ? team.id : team
        if (projectId) {
            scope.push(`project:${projectId}`)
        }
        const newToken = await app.db.models.AccessToken.create({
            token: generatedToken,
            expiresAt,
            scope, // scope format: ['device:provision', `name:${token name}`, `project:${project id}`]
            ownerId: teamId,
            ownerType: 'team'
        })
        const token = await app.db.views.AccessToken.provisioningTokenSummary(newToken)
        token.token = generatedToken
        return token
    },

    /**
     * Update an auto device provisioning token (adp).
     * Only the project and expiry date can be updated.
     * @param {Object} app - The app object
     * @param {Object} token - The token to update
     * @param {Object|string} [project] - The project object or id (set to `null` or `undefined` to remove project scope)
     * @param {Date|'never'} [expiresAt] - The expiry date. If `undefined`, the token never expires
     */
    updateTokenForTeamDeviceProvisioning: async function (app, token, project, expiresAt) {
        let scope = [...(token.scope || [])]
        const projectId = (project && typeof project === 'object') ? project.id : project
        // remove project scope & add updated project scope (if set)
        scope = scope.filter((s) => !s.startsWith('project:'))
        if (projectId) {
            scope.push(`project:${projectId}`)
        }
        const tokenUpdates = {
            scope, // scope format: ['device:provision', `name:${token name}`, `project:${project id}`]
            expiresAt
        }
        await app.db.models.AccessToken.update(tokenUpdates, { where: { id: token.id } })
        return { token: token.id }
    },

    generatePlatformStatisticsToken: async function (app, user) {
        // Clear any existing platform:stats token
        await app.db.controllers.AccessToken.removePlatformStatisticsToken()
        await app.settings.set('platform:stats:token', true)
        return app.db.controllers.AccessToken.createTokenForUser(user, null, ['platform:stats'])
    },
    removePlatformStatisticsToken: async function (app) {
        // This assumes we only have this one path for creating such a token.
        // In the future, if we support Personal Access Tokens, it will be
        // possible to have multiple tokens with just this scope - so this
        // logic will need changing
        await app.db.models.AccessToken.destroy({
            where: {
                scope: 'platform:stats'
            }
        })
        await app.settings.set('platform:stats:token', false)
    },

    createPersonalAccessToken: async function (app, user, scope, expiresAt, name) {
        const userId = typeof user === 'number' ? user : user.id
        const token = generateToken(32, 'ffpat')
        const tok = await app.db.models.AccessToken.create({
            name,
            token,
            scope,
            expiresAt,
            ownerId: '' + userId,
            ownerType: 'user'
        })
        return {
            id: tok.id,
            name,
            token,
            expiresAt
        }
    },
    updatePersonalAccessToken: async function (app, user, tokenId, scope, expiresAt) {
        const userId = typeof user === 'number' ? user : user.id
        const token = await app.db.models.AccessToken.byId(tokenId)
        if (token) {
            if (token.ownerType === 'user' && token.ownerId === '' + userId) {
                token.scope = scope
                if (expiresAt === undefined) {
                    token.expiresAt = null
                } else {
                    token.expiresAt = expiresAt
                }
                await token.save()
            } else {
                // should throw error
                throw new Error('Not Authorized')
            }
        } else {
            // should throw unknown token error
            throw new Error('Not Found')
        }
        return token
    },
    removePersonalAccessToken: async function (app, user, tokenId) {
        const userId = typeof user === 'number' ? user : user.id
        let token = await app.db.models.AccessToken.byId(tokenId)
        if (token) {
            if (token.ownerType === 'user' && token.ownerId === '' + userId) {
                await token.destroy()
            } else {
                // should throw error
                throw new Error('Not Authorized')
            }
        } else {
            // should throw error
            throw new Error('Not Found')
        }
        token = null
        return token
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
