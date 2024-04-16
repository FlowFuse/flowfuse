const sharedUser = require('./shared/users')
const UserInvitations = require('./userInvitations')

/**
 * User api routes
 *
 * - /api/v1/user
 *
 * These routes all operate in the context of the logged-in user
 * req.session.User
 *
 */
module.exports = async function (app) {
    app.register(UserInvitations, { prefix: '/invitations' })

    /**
     * Get the profile of the current logged in user
     * /api/v1/user
     */
    app.get('/', {
        schema: {
            summary: 'Get the current user profile',
            tags: ['User'],
            response: {
                200: {
                    $ref: 'User'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        },
        preHandler: app.needsPermission('user:read'),
        config: { allowUnverifiedEmail: true, allowExpiredPassword: true }
    }, async (request, reply) => {
        const user = request.session.User

        const response = await app.db.views.User.userProfile(user)
        if (app.license.active() && app.billing && app.db.controllers.Subscription.freeTrialCreditEnabled()) {
            response.free_trial_available = await app.db.controllers.Subscription.userEligibleForFreeTrialCredit(user)
        }

        reply.send(response)
    })

    /**
     * Update the current user's password
     * /api/v1/user/change_password
     */
    app.put('/change_password', {
        preHandler: app.needsPermission('user:edit'),
        config: {
            allowExpiredPassword: true,
            rateLimit: app.config.rate_limits ? { max: 5, timeWindow: 30000 } : false
        },
        schema: {
            summary: 'Change the current users password',
            tags: ['User'],
            body: {
                type: 'object',
                required: ['old_password', 'password'],
                properties: {
                    old_password: { type: 'string', description: 'the old password' },
                    password: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            await app.db.controllers.User.changePassword(request.session.User, request.body.old_password, request.body.password)
            await app.auditLog.User.user.updatedPassword(request.session.User, null)
            await app.postoffice.send(request.session.User, 'PasswordChanged', { })
            // Delete all existing sessions for this user
            await app.db.controllers.Session.deleteAllUserSessions(request.session.User)
            // Create new session
            const sessionInfo = await app.createSessionCookie(request.session.User.username)
            if (sessionInfo) {
                reply.setCookie('sid', sessionInfo.session.sid, sessionInfo.cookieOptions)
            }
            // Clear any password reset tokens
            await app.db.controllers.AccessToken.deleteAllUserPasswordResetTokens(request.session.User)

            reply.send({ status: 'okay' })
        } catch (err) {
            let resp
            if (err.message === 'Password Too Weak') {
                resp = { code: 'password_change_failed_too_weak', error: 'password too weak' }
            } else {
                resp = { code: 'password_change_failed', error: 'password change failed' }
            }
            await app.auditLog.User.user.updatedPassword(request.session.User, resp)
            reply.code(400).send(resp)
        }
    })

    /**
     * Get the teams of the current logged in user
     * /api/v1/user/teams
     */
    app.get('/teams', {
        preHandler: app.needsPermission('user:team:list'),
        schema: {
            summary: 'Get a list of the current users teams',
            tags: ['User'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        teams: { $ref: 'UserTeamList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const teams = await app.db.models.Team.forUser(request.session.User)
        const result = await app.db.views.Team.userTeamList(teams)
        reply.send({
            meta: {}, // For future pagination
            count: result.length,
            teams: result
        })
    })

    /**
     * Update user settings
     * /api/v1/user/
     */
    app.put('/', {
        preHandler: app.needsPermission('user:edit'),
        config: {
            rateLimit: app.config.rate_limits ? { max: 5, timeWindow: 30000 } : false
        },
        schema: {
            summary: 'Update the current users settings',
            tags: ['User'],
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    tcs_accepted: { type: 'boolean' },
                    defaultTeam: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'User'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        sharedUser.updateUser(app, request.session.User, request, reply, 'user')
        return reply // fix errors in tests "Promise may not be fulfilled with 'undefined' when statusCode is not 204" https://github.com/fastify/help/issues/627
    })

    /**
     * Delete user
     * /api/v1/user/
     */
    app.delete('/', {
        preHandler: app.needsPermission('user:delete'),
        schema: {
            summary: 'Delete the current user',
            tags: ['User'],
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            const user = request.session.User
            const deletedUser = {
                id: user.id,
                hashid: user.hashid,
                username: user.username,
                email: user.email
            }
            await user.destroy()
            // Create an audit log entry for the deleted user
            // NOTE: it is called as the system user (0) because the user
            // is already deleted at this point
            await app.auditLog.User.user.deleted(0, null, deletedUser)
            reply.clearCookie('sid')
            reply.send({ status: 'okay' })
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.User.user.deleted(request.session.User, resp, request.session.User)
            reply.code(400).send(resp)
        }
    })

    /**
     * Get Personal Access Tokens
     * /api/v1/user/pat
     */
    app.get('/tokens', {
        schema: {
            summary: 'List users Personal Access Tokens',
            tags: ['Tokens'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        count: { type: 'number' },
                        tokens: { $ref: 'PersonalAccessTokenSummaryList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            const tokens = await app.db.models.AccessToken.getPersonalAccessTokens(request.session.User)
            reply.send({
                tokens: app.db.views.AccessToken.personalAccessTokenSummaryList(tokens),
                count: tokens.length
            })
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            reply.code(400).send(resp)
        }
    })

    /**
     * Create Personal Access Token
     * /api/v1/user/pat
     */
    app.post('/tokens', {
        config: {
            rateLimit: app.config.rate_limits ? { max: 5, timeWindow: 30000 } : false
        },
        schema: {
            summary: 'Create user Personal Access Token',
            tags: ['Tokens'],
            body: {
                type: 'object',
                properties: {
                    scope: { type: 'string' },
                    expiresAt: { type: 'number' },
                    name: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'PersonalAccessToken'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const updates = new app.auditLog.formatters.UpdatesCollection()
        try {
            const body = request.body
            const token = await app.db.controllers.AccessToken.createPersonalAccessToken(request.session.User, body.scope, body.expiresAt, body.name)
            // token has already been sanitised via views.AccessToken.personalAccessToken
            updates.push('id', token.id)
            updates.push('name', token.name)
            updates.push('scope', body.scope)
            if (token.expiresAt) {
                updates.push('expiresAt', token.expiresAt)
            }
            await app.auditLog.User.user.pat.created(request.session.User, null, updates)
            reply.send(token)
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            reply.code(400).send(resp)
        }
    })

    /**
     * Delete Personal Access Token
     * /api/v1/user/tokens/:id
     */
    app.delete('/tokens/:id', {
        schema: {
            summary: 'Delete user Personal Access Token',
            tags: ['Tokens'],
            params: {
                id: { type: 'string' }
            },
            response: {
                201: {},
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            const token = await app.db.models.AccessToken.byId(request.params.id, 'user', request.session.User.id)
            if (token) {
                const updates = new app.auditLog.formatters.UpdatesCollection()
                updates.push('id', request.params.id)
                await app.auditLog.User.user.pat.deleted(request.session.User, null, updates)
                await token.destroy()
                reply.code(201).send()
                return
            }
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            reply.code(400).send(resp)
        }
    })

    /**
     * Update Personal Access Token
     * /api/v1/user/tokens/:id
     */
    app.put('/tokens/:id', {
        schema: {
            summary: 'Update users Personal Access Token',
            tags: ['Tokens'],
            params: {
                id: { type: 'string' }
            },
            body: {
                scope: { type: 'string' },
                expiresAt: { type: 'number' }
            },
            response: {
                200: {
                    $ref: 'PersonalAccessTokenSummary'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const updates = new app.auditLog.formatters.UpdatesCollection()
        try {
            const oldToken = await app.db.models.AccessToken.byId(request.params.id, 'user', request.session.User.id)
            if (oldToken) {
                const body = request.body
                const newToken = await app.db.controllers.AccessToken.updatePersonalAccessToken(request.session.User, request.params.id, body.scope, body.expiresAt)
                updates.pushDifferences(oldToken, newToken)
                await app.auditLog.User.user.pat.updated(request.session.User, null, updates)
                reply.send(app.db.views.AccessToken.personalAccessTokenSummary(newToken))
                return
            }
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            reply.code(400).send(resp)
        }
    })
}
