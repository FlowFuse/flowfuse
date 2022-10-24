
module.exports = {

    /**
     * For audit logging the event.
     * @callback userLogCallback
     * @param {number} userId ID of the user performing the action
     * @param {string} event The name of the event
     * @param {*} body The body/data for the log entry
     * @param {string|number} [entityId] The ID of the user being affected (where available)
     */

    /**
     * Update a user
     * This is common code shared by:
     *  * `PUT /api/v1/user/`     (user.js)
     *  * `PUT /api/v1/users/:id` (users.js)
     *
     * Access control is handled by those individual routes.
     * For a request to reach this function, the request has passed all auth checks.
     * @param {object} app The app object
     * @param {object} user The user to update
     * @param {import("node_modules/fastify/fastify").FastifyRequest} request The incoming request
     * @param {import("node_modules/fastify/fastify").FastifyReply} reply The HTTP reply object
     * @param {userLogCallback} [userLog] Audit Log function
     */
    updateUser: async (app, user, request, reply, userLog) => {
        const noop = async () => {}
        userLog = userLog || noop
        const logUserInfo = {
            username: user.username
        }
        try {
            const oldProfile = app.db.views.User.userProfile(user)
            const wasVerified = user.email_verified
            if (request.body.name && user.name !== request.body.name) {
                user.name = request.body.name
            } else if (request.body.name === '') {
                user.name = request.body.username || user.username
            }
            if (request.body.email) {
                user.email = request.body.email
            }
            if (request.body.username) {
                user.username = request.body.username
            }
            if (request.body.tcs_accepted) {
                user.tcs_accepted = new Date()
            }
            if (request.session.User.admin) {
                // Settings only an admin can modify
                if (request.body.email_verified !== undefined) {
                    user.email_verified = request.body.email_verified
                }

                if (request.body.admin !== undefined) {
                    user.admin = request.body.admin
                }

                if (request.body.password_expired === true) {
                    user.password_expired = true
                }

                if (request.body.suspended !== undefined) {
                    if (request.session.User.id !== user.id) {
                        if (request.body.suspended === true) {
                            await app.db.controllers.User.suspend(user)
                            if (app.postoffice.enabled()) {
                                // Send email
                                const context = {}
                                if (app.config.support_contact) {
                                    context.support = app.config.support_contact
                                } else {
                                    const admin = await app.db.models.User.scope('admins').findOne()
                                    if (admin?.email) {
                                        context.support = `mailto:${admin.email}`
                                    } else {
                                        context.support = 'the administrator'
                                    }
                                }
                                try {
                                    context.url = new URL(context.support)
                                    if (context.url.protocol === 'mailto:' || context.url.protocol === 'tel:') {
                                        context.support = context.url.pathname
                                    }
                                } catch (err) {
                                }
                                app.postoffice.send(user, 'UserSuspended', context)
                            }
                        } else {
                            user.suspended = false
                        }
                    } else {
                        const resp = { code: 'invalid_request', error: 'cannot suspend self' }
                        await userLog(request.session.User.id, 'update-user', resp, user.id)
                        reply.code(400).send(resp)
                        return
                    }
                }
            }
            if (request.body.defaultTeam !== undefined) {
                // verify user is a member of request.body.defaultTeam
                const membership = await app.db.models.TeamMember.getTeamMembership(user.id, request.body.defaultTeam)
                if (membership) {
                    user.defaultTeamId = membership.TeamId
                } else {
                    const resp = { code: 'invalid_team', error: 'invalid team', team: request.body.defaultTeam }
                    await userLog(request.session.User.id, 'update-user', { ...resp, user: logUserInfo }, user.id)
                    reply.code(400).send(resp)
                    return
                }
            }
            await user.save()

            // re-send verification email if a user was previously verifed and is now not verified
            if (wasVerified && user.email_verified === false && request.session.User.id !== user.id) {
                try {
                    const verifyToken = await app.db.controllers.User.generateEmailVerificationToken(user)
                    await app.postoffice.send(
                        user,
                        'VerifyEmail',
                        {
                            confirmEmailLink: `${app.config.base_url}/account/verify/${verifyToken}`
                        }
                    )
                } catch (error) {
                    console.warn('Unable to re-send verify email', error)
                }
            }
            // diff profile before and after for log
            const newProfile = app.db.views.User.userProfile(user)
            const newValues = Object.fromEntries(Object.entries(newProfile).filter(([k, v]) => oldProfile[k] !== v))
            const originalValues = Object.fromEntries(Object.entries(oldProfile).filter(([k, v]) => newProfile[k] !== v))
            await userLog(
                request.session.User.id,
                'update-user',
                { old: originalValues, new: newValues, user: logUserInfo }, // log body
                user.id
            )
            reply.send(newProfile)
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            console.log(err.toString())
            console.log(responseMessage)
            const resp = { code: 'unexpected_error', error: responseMessage }
            await userLog(request.session.User.id, 'update-user', { ...resp, user: logUserInfo }, user.id)
            reply.code(400).send(resp)
        }
    }
}
