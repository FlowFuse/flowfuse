const sharedUser = require('./shared/users')

/**
 * Users api routes
 *
 * - /api/v1/users
 *
 * @namespace users
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    // Lets assume all apis that access bulk users are admin only.
    app.addHook('preHandler', app.verifyAdmin)
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.userId !== undefined) {
            if (request.params.userId) {
                try {
                    request.user = await app.db.models.User.byId(request.params.userId)
                    if (!request.user) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                } catch (err) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            } else {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    })
    /**
     * Get a list of all known users
     * @name /api/v1/users
     * @static
     * @memberof forge.routes.api.users
     */
    app.get('/', async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const users = await app.db.models.User.getAll(paginationOptions)
        users.users = users.users.map(u => app.db.views.User.userProfile(u))
        reply.send(users)
    })

    /**
     * Get a user's settings
     * @name /api/v1/users/:userId
     * @static
     * @memberof forge.routes.api.users
     */
    app.get('/:userId', async (request, reply) => {
        reply.send(app.db.views.User.userProfile(request.user))
    })

    /**
     * Update user settings
     * @name /api/v1/users/:userId
     * @static
     * @memberof forge.routes.api.users
     */
    app.put('/:userId', async (request, reply) => {
        await sharedUser.updateUser(app, request.user, request, reply, userLog)
    })

    /**
     * Create a new user
     */
    app.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['name', 'username', 'password'],
                properties: {
                    name: { type: 'string' },
                    username: { type: 'string' },
                    password: { type: 'string' },
                    isAdmin: { type: 'boolean' },
                    createDefaultTeam: { type: 'boolean' }
                }
            }
        }
    }, async (request, reply) => {
        const logUserInfo = {
            username: request.body.username,
            admin: !!request.body.isAdmin
        }
        if (/^(admin|root)$/.test(request.body.username)) {
            const resp = { code: 'invalid_username', error: 'invalid username' }
            await userLog(request.session.User.id, 'create-user', { ...resp, user: logUserInfo })
            reply.code(400).send(resp)
            return
        }
        if (request.body.createDefaultTeam) {
            const teamLimit = app.license.get('teams')
            const teamCount = await app.db.models.Team.count()
            if (teamCount >= teamLimit) {
                const resp = { code: 'team_limit_reached', error: 'Unable to create user team: license limit reached' }
                await userLog(request.session.User.id, 'create-user', { ...resp, user: logUserInfo })
                reply.code(400).send(resp)
                return
            }
        }
        try {
            const newUser = await app.db.models.User.create({
                username: request.body.username,
                name: request.body.name,
                email: request.body.email,
                email_verified: true,
                password: request.body.password,
                admin: !!request.body.isAdmin
            })
            logUserInfo.id = newUser.id
            await userLog(request.session.User.id, 'create-user', { user: logUserInfo }, newUser.id)
            if (request.body.createDefaultTeam) {
                await app.db.controllers.Team.createTeamForUser({
                    name: `Team ${request.body.name}`,
                    slug: request.body.username,
                    TeamTypeId: (await app.db.models.TeamType.byName('starter')).id
                }, newUser)
                await userLog(request.session.User.id, 'auto-create-team', {
                    team: {
                        name: `Team ${request.body.name}`,
                        type: 'starter'
                    },
                    user: logUserInfo
                }, newUser.id)
            }
            reply.send({ status: 'okay' })
        } catch (err) {
            let responseMessage
            let responseCode = 'unexpected_error'
            if (/user_username_lower_unique|Users_username_key/.test(err.parent?.toString())) {
                responseMessage = 'username not available'
                responseCode = 'invalid_username'
            } else if (/user_email_lower_unique|Users_email_key/.test(err.parent?.toString())) {
                responseMessage = 'email not available'
                responseCode = 'invalid_email'
            } else if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            const resp = { code: responseCode, error: responseMessage }
            await userLog(request.session.User.id, 'create-user', { ...resp, user: logUserInfo }, logUserInfo?.id)
            reply.code(400).send(resp)
        }
    })

    /**
     * Delete a user
     * @name /api/v1/users/:userId
     * @static
     * @memberof forge.routes.api.users
     */
    app.delete('/:userId', async (request, reply) => {
        const userId = request.params.userId
        try {
            await request.user.destroy()
            await userLog(request.session.User.id, 'delete-user', { user: request.user }, userId)
            reply.send({ status: 'okay' })
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            await userLog(request.session.User.id, 'delete-user', { ...resp, user: request.user }, userId)
            reply.code(400).send(resp)
        }
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
            await app.db.controllers.AuditLog.userLog(userId, `users.${event}`, body, entityId)
        } catch (error) {
            console.error(error)
        }
    }
}
