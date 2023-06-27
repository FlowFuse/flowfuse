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
        config: { allowExpiredPassword: true },
        schema: {
            summary: 'Change a users password',
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
            reply.send({ status: 'okay' })
        } catch (err) {
            const resp = { code: 'password_change_failed', error: 'password change failed' }
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
            summary: 'Get a list of the users teams',
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
        schema: {
            summary: 'Update a users settings',
            tags: ['User'],
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    tcs_accepted: { type: 'boolean' },
                    email_verified: { type: 'boolean' },
                    admin: { type: 'boolean' },
                    password_expired: { type: 'boolean' },
                    suspended: { type: 'boolean' },
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
            summary: 'Delete a user',
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
}
