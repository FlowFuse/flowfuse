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
 * @namespace user
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    app.register(UserInvitations, { prefix: '/invitations' })

    /**
     * Get the profile of the current logged in user
     * @name /api/v1/user
     * @static
     * @memberof forge.routes.api.user
     */
    app.get('/', {
        preHandler: app.needsPermission('user:read'),
        config: { allowUnverifiedEmail: true, allowExpiredPassword: true }
    }, async (request, reply) => {
        const users = await app.db.views.User.userProfile(request.session.User)
        reply.send(users)
    })

    /**
     * Update the current user's password
     * @name /api/v1/user/change_password
     * @static
     * @memberof forge.routes.api.user
     */
    app.put('/change_password', {
        preHandler: app.needsPermission('user:edit'),
        config: { allowExpiredPassword: true },
        schema: {
            body: {
                type: 'object',
                required: ['old_password', 'password'],
                properties: {
                    old_password: { type: 'string' },
                    password: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        try {
            await app.db.controllers.User.changePassword(request.session.User, request.body.old_password, request.body.password)
            await userLog(request.session.User.id, 'change-password', null, request.session.User.id)
            reply.send({ status: 'okay' })
        } catch (err) {
            const resp = { code: 'password_change_failed', error: 'password change failed' }
            await userLog(request.session.User.id, 'change-password', resp, request.session.User.id)
            reply.code(400).send(resp)
        }
    })

    /**
     * Get the teams of the current logged in user
     * @name /api/v1/user/teams
     * @static
     * @memberof forge.routes.api.user
     */
    app.get('/teams', {
        preHandler: app.needsPermission('user:read')
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
     * @name /api/v1/user/
     * @static
     * @memberof forge.routes.api.user
     */
    app.put('/', {
        preHandler: app.needsPermission('user:edit')
    }, async (request, reply) => {
        sharedUser.updateUser(app, request.session.User, request, reply, userLog)
        return reply // fix errors in tests "Promise may not be fulfilled with 'undefined' when statusCode is not 204" https://github.com/fastify/help/issues/627
    })

    /**
     * Log events against the entityType `users.x.y`
     * @param {number} userId User performing the action
     * @param {string} event The name of the event
     * @param {*} body The body/data for the log entry
     * @param {string|number} [entityId] The ID of the user being affected (where available)
     */
    async function userLog (userId, event, body, entityId) {
        try {
            // function userLog (app, UserId, event, body, entityId)
            await app.db.controllers.AuditLog.userLog(
                userId,
                `user.${event}`,
                body,
                entityId || userId
            )
        } catch (error) {
            console.error(error)
        }
    }
}
