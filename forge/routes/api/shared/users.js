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
     * @param {'user'|'users'} eventBase The audit log event prefix e.g. user.update or users.update
     */
    updateUser: async (app, user, request, reply, eventBase) => {
        const noop = async () => {}
        const auditLog = app.auditLog.User[eventBase] || noop
        try {
            const originalUser = {
                id: user.id,
                hashid: user.hashid,
                username: user.username,
                email: user.email
            }

            const oldProfile = app.db.views.User.userProfile(user)
            const wasVerified = user.email_verified
            if (request.body.name && user.name !== request.body.name) {
                user.name = request.body.name
            } else if (request.body.name === '') {
                user.name = request.body.username || user.username
            }
            if (request.body.email) {
                if (user.sso_enabled && user.email !== request.body.email) {
                    const err = new Error('Cannot change password for sso-enabled user')
                    err.code = 'invalid_request'
                    throw err
                }
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
                        await auditLog.updatedUser(request.session.User, resp, null, user)
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
                    await auditLog.updatedUser(request.session.User, resp, null, user)
                    reply.code(400).send(resp)
                    return
                }
            }
            await user.save()

            if (user.username !== originalUser.username) {
                await app.postoffice.send(originalUser, 'UsernameChanged', {
                    oldUsername: originalUser.username,
                    newUsername: user.username
                })
            }
            if (user.email !== originalUser.email) {
                await app.postoffice.send(originalUser, 'EmailChanged', {
                    oldEmail: originalUser.email,
                    newEmail: user.email
                })
            }
            // re-send verification email if a user was previously verified and is now not verified
            if (wasVerified && user.email_verified === false && request.session.User.id !== user.id) {
                try {
                    const verificationToken = await app.db.controllers.User.generateEmailVerificationToken(user)
                    await app.postoffice.send(
                        user,
                        'VerifyEmail',
                        {
                            confirmEmailLink: `${app.config.base_url}/account/verify/${verificationToken}`
                        }
                    )
                } catch (error) {
                    console.warn('Unable to re-send verify email', error)
                }
            }
            // diff profile before and after for log
            const newProfile = app.db.views.User.userProfile(user)
            const updates = new app.auditLog.formatters.UpdatesCollection()
            updates.pushDifferences(oldProfile, newProfile)
            await auditLog.updatedUser(request.session.User, null, updates, user)
            reply.send(newProfile)
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            let errorCode = 'unexpected_error'
            if (responseMessage.includes('isEmail on email')) {
                errorCode = 'invalid_email'
            } else if (err.code) {
                errorCode = err.code
            }
            const resp = { code: errorCode, error: responseMessage }
            await auditLog.updatedUser(request.session.User, resp, null, user) // log as error
            reply.code(400).send(resp)
        }
    }
}
