const { Op } = require('sequelize')

const { generateToken, generateNumericToken, sha256, randomPhrase } = require('../utils')

const DEFAULT_TOKEN_SESSION_EXPIRY = 1000 * 60 * 30 // 30 mins session - with refresh token support

const DEFAULT_DEVICE_OTC_EXPIRY = 1000 * 60 * 60 * 24 // 24 hours

/*
 * fft - project
 * ffpr - password reset
 * ffd - device
 * ffu - user
 * ffadp - auto device provisioning
 * ffpat - personal access token
 * ffhttp - httpNode access token
 * fftpb - third party broker
 * ffnpm - Team npm registry
 */

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
        const expiresAt = new Date(Date.now() + (1800 * 1000)) // 30 minutes
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
     * Create an AccessToken for a user's email verification
     */
    createTokenForEmailVerification: async function (app, user) {
        // Ensure any existing tokens are removed first
        await app.db.controllers.AccessToken.deleteAllUserEmailVerificationTokens(user)

        const token = generateNumericToken()
        const expiresAt = new Date(Date.now() + (1000 * 60 * 30)) // 30 minutes
        await app.db.models.AccessToken.create({
            token,
            expiresAt,
            scope: 'email:verify',
            ownerId: '' + user.id,
            ownerType: 'user'
        })
        return { token }
    },

    /**
     * Deletes any pending email-verification tokens for a user.
     */
    deleteAllUserEmailVerificationTokens: async function (app, user) {
        await app.db.models.AccessToken.destroy({
            where: {
                ownerType: 'user',
                scope: 'email:verify',
                ownerId: '' + user.id
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
    createTokenForUser: async function (app, user, expiresAt, scope = [], includeRefresh, ownerType = 'user') {
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
            ownerType
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
     * @param {'application'|'instance'} [autoAssignType] - The type of auto assign (set to `null` or `undefined` to remove auto assign)
     * @param {Object|string} [autoAssignItem] - The auto assign project/application id (Only valid if autoAssignType is set)
     * @param {Date|'never'} [expiresAt] - The expiry date. If `undefined`, the token never expires
     */
    createTokenForTeamDeviceProvisioning: async function (app, name, team, autoAssignType, autoAssignItem, expiresAt) {
        const generatedToken = generateToken(32, 'ffadp')
        const scope = ['device:provision', `name:${name}`]
        let autoAssignId = null
        if (autoAssignItem) {
            if (typeof autoAssignItem === 'object') {
                autoAssignId = autoAssignItem.id
            } else {
                autoAssignId = autoAssignItem || null
            }
        }
        const projectId = autoAssignType === 'instance' ? autoAssignId : null
        const applicationId = autoAssignType === 'application' ? autoAssignId : null
        const teamId = (team && typeof team === 'object') ? team.id : team
        if (applicationId) {
            scope.push(`application:${applicationId}`)
        } else if (projectId) {
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
     * @param {'application'|'instance'} [autoAssignType] - The type of auto assign (set to `null` or `undefined` to remove auto assign)
     * @param {Object|string} [autoAssignItem] - The auto assign project/application (or id). Set to `null` or `undefined` to remove auto assign
     * @param {Date|'never'} [expiresAt] - The expiry date. If `undefined`, the token never expires
     */
    updateTokenForTeamDeviceProvisioning: async function (app, token, autoAssignType, autoAssignItem, expiresAt) {
        let scope = [...(token.scope || [])]
        let autoAssignId = null
        if (autoAssignItem) {
            if (typeof autoAssignItem === 'object') {
                autoAssignId = autoAssignItem.id
            } else {
                autoAssignId = autoAssignItem || null
            }
        }
        const instanceId = autoAssignType === 'instance' ? autoAssignId : null
        const applicationId = autoAssignType === 'application' ? autoAssignId : null
        // remove instance/application scope & add updated instance/application scope (if set)
        scope = scope.filter((s) => !s.startsWith('project:'))
        scope = scope.filter((s) => !s.startsWith('application:'))
        if (applicationId) {
            scope.push(`application:${applicationId}`)
        } else if (instanceId) {
            scope.push(`project:${instanceId}`)
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

    createPersonalAccessToken: async function (app, user, scope, expiresAt, name, { readOnly = false, adminOptIn = false, teamIds = [] } = {}) {
        const userId = typeof user === 'number' ? user : user.id
        const token = generateToken(32, 'ffpat')
        let tokId
        await app.db.sequelize.transaction(async (t) => {
            const tok = await app.db.models.AccessToken.create({
                name,
                token,
                scope,
                expiresAt,
                readOnly,
                adminOptIn,
                ownerId: '' + userId,
                ownerType: 'user'
            }, { transaction: t })
            tokId = tok.id
            if (teamIds.length > 0) {
                const scopes = teamIds.map(teamId => ({
                    AccessTokenId: tok.id,
                    TeamId: app.db.models.Team.decodeHashid(teamId),
                    UserId: userId
                }))
                await app.db.models.AccessTokenTeamScope.bulkCreate(scopes, { transaction: t })
            }
        })
        const reloaded = await app.db.models.AccessToken.findOne({
            where: { id: tokId },
            include: [{
                model: app.db.models.AccessTokenTeamScope,
                include: [{ model: app.db.models.Team, attributes: ['id', 'name'] }]
            }]
        })
        const result = app.db.views.AccessToken.personalAccessTokenSummary(reloaded)
        result.token = token
        return result
    },
    updatePersonalAccessToken: async function (app, user, tokenId, scope, expiresAt, { readOnly, adminOptIn, teamIds } = {}) {
        const userId = typeof user === 'number' ? user : user.id
        const token = await app.db.models.AccessToken.byId(tokenId, 'user', userId)
        if (token) {
            token.scope = scope
            if (expiresAt === undefined) {
                token.expiresAt = null
            } else {
                token.expiresAt = expiresAt
            }
            if (readOnly !== undefined) {
                token.readOnly = readOnly
            }
            if (adminOptIn !== undefined) {
                token.adminOptIn = adminOptIn
            }
            await token.save()
            if (teamIds !== undefined) {
                await app.db.sequelize.transaction(async (t) => {
                    await app.db.models.AccessTokenTeamScope.destroy({
                        where: { AccessTokenId: token.id },
                        transaction: t
                    })
                    if (teamIds.length > 0) {
                        const scopes = teamIds.map(teamId => ({
                            AccessTokenId: token.id,
                            TeamId: app.db.models.Team.decodeHashid(teamId),
                            UserId: userId
                        }))
                        await app.db.models.AccessTokenTeamScope.bulkCreate(scopes, { transaction: t })
                    }
                })
            }
            const reloaded = await app.db.models.AccessToken.findOne({
                where: { id: token.id },
                include: [{
                    model: app.db.models.AccessTokenTeamScope,
                    include: [{ model: app.db.models.Team, attributes: ['id', 'name'] }]
                }]
            })
            return reloaded
        } else {
            // should throw unknown token error
            throw new Error('Not Found')
        }
    },

    // Should these only get added via forge/ee/lib/httpTokens?
    createHTTPNodeToken: async function (app, owner, name, scope = [''], expiresAt) {
        // Ensure a string
        const ownerId = '' + owner.id
        let ownerType
        if (owner.constructor.name === 'Project') {
            ownerType = 'http'
        } else if (owner.constructor.name === 'Device') {
            ownerType = 'http:device'
        } else {
            throw new Error('Invalid owner type for HTTP Node Token: ' + owner.constructor.name)
        }
        const token = generateToken(32, 'ffhttp')
        const tok = await app.db.models.AccessToken.create({
            token,
            expiresAt,
            name,
            scope,
            ownerId,
            ownerType
        })
        // Overwrite the hashed token with the plain value
        const result = app.db.views.AccessToken.instanceHTTPTokenSummary(tok)
        result.token = token
        return result
    },
    updateHTTPNodeToken: async function (app, owner, tokenId, scope = [''], expiresAt) {
        const ownerId = '' + owner.id
        let ownerType
        if (owner.constructor.name === 'Project') {
            ownerType = 'http'
        } else if (owner.constructor.name === 'Device') {
            ownerType = 'http:device'
        } else {
            throw new Error('Invalid owner type for HTTP Node Token: ' + owner.constructor.name)
        }
        const token = await app.db.models.AccessToken.byId(tokenId, ownerType, ownerId)
        if (token) {
            token.scope = scope
            if (expiresAt === undefined) {
                token.expiresAt = null
            } else {
                token.expiresAt = expiresAt
            }
            await token.save()
        } else {
            // should throw unknown token error
            throw new Error('Not Found')
        }
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
                    [Op.notIn]: ['password:reset', 'email:verify']
                }
            },
            include: [{
                model: app.db.models.AccessTokenTeamScope,
                include: [{ model: app.db.models.Team, attributes: ['id', 'name'] }]
            }]
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

    getOrExpireEmailVerificationToken: async function (app, user, token) {
        let accessToken = await app.db.models.AccessToken.findOne({
            where: {
                token: sha256(token),
                ownerId: '' + user.id,
                ownerType: 'user',
                scope: 'email:verify'
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
    },

    createTokenForBroker: async function (app, broker, expiresAt, scope = ['broker:credentials', 'broker:topics']) {
        const existingBrokerToken = await app.db.models.AccessToken.findOne({
            where: {
                ownerId: '' + broker.id,
                ownerType: 'broker'
            }
        })
        if (existingBrokerToken) {
            await existingBrokerToken.destroy()
        }
        const token = generateToken(32, 'fftpb')
        await app.db.models.AccessToken.create({
            token,
            expiresAt,
            scope,
            ownerId: '' + broker.id,
            ownerType: 'broker'
        })
        return { token }
    },

    createTokenForTeamBrokerAgent: async function (app, broker, expiresAt, scope = ['broker:credentials', 'broker:credentials:edit', 'broker:topics']) {
        const existingBrokerToken = await app.db.models.AccessToken.findOne({
            where: {
                ownerId: '' + broker.id,
                ownerType: 'teamBrokerAgent'
            }
        })
        if (existingBrokerToken) {
            await existingBrokerToken.destroy()
        }
        const token = generateToken(32, 'fftpb')
        await app.db.models.AccessToken.create({
            token,
            expiresAt,
            scope,
            ownerId: '' + broker.id,
            ownerType: 'teamBrokerAgent'
        })
        return { token }
    },

    createTokenForNPM: async function (app, entity, team, scope = ['team:packages:read']) {
        // Adding prefix to the entityId of `p-`, `d-` and `u-` rather than relying on
        // no hashid collisions
        let ownerId
        if (entity instanceof app.db.models.Project) {
            ownerId = `p-${entity.id}@${team.hashid}`
        } else if (entity instanceof app.db.models.Device) {
            ownerId = `d-${entity.hashid}@${team.hashid}`
        } else if (entity instanceof app.db.models.User) {
            ownerId = entity.username
        }
        const existingNPMToken = await app.db.models.AccessToken.findOne({
            where: {
                ownerId,
                ownerType: 'npm'
            }
        })
        if (existingNPMToken) {
            await existingNPMToken.destroy()
        }
        const token = generateToken(32, 'ffnpm')
        await app.db.models.AccessToken.create({
            token,
            ownerId,
            ownerType: 'npm',
            scope
        })
        return {
            username: ownerId,
            token
        }
    }
}
