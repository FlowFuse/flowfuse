/**
 * Routes related to session handling, login/out etc
 *
 * Handles adding `request.sid` and `request.session` to each request if there
 * is a valid session.
 *
 * - `/account/login`
 * - `/account/logout`
 *
 * Provides preHandler functions to secure routes
 *
 *  - `forge.verifySession`
 *  - `forge.verifyAdmin`
 *
 * @namespace session
 * @memberof forge.routes
 */
const fp = require('fastify-plugin')

// Default to a 12 hour session if the user ticks 'remember me'
// TODO - turn this into an idle timeout, with a separate 'max session' timeout.
const SESSION_MAX_AGE = 60 * 60 * 12 // 12 hours in seconds

// Options to apply to our session cookie
const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    path: '/',
    signed: true
    // TODO: secure only when in production
}

module.exports = fp(async function (app, opts, done) {
    await app.register(require('./oauth'), { logLevel: 'warn' })
    await app.register(require('./permissions'))

    // WIP:
    async function verifyToken (request, reply) {
        if (request.headers && request.headers.authorization) {
            const parts = request.headers.authorization.split(' ')
            if (parts.length === 2) {
                const scheme = parts[0]
                const token = parts[1]
                if (scheme !== 'Bearer') {
                    throw new Error('Unsupported authorization scheme')
                }
                if (/^ff[td]/.test(token)) {
                    const accessToken = await app.db.controllers.AccessToken.getOrExpire(token)
                    if (accessToken) {
                        request.session = {
                            ownerId: accessToken.ownerId,
                            ownerType: accessToken.ownerType,
                            scope: accessToken.scope
                        }
                        return
                    }
                } else if (/^ffp/.test(token)) {
                    request.session = await app.db.controllers.Session.getOrExpire(token)
                    return
                }
                throw new Error(`bad token ${token}`)
            } else {
                // return done(new Error("Malformed authorization header"))
                throw new Error('Malformed authorization header')
            }
        } else {
            // done(new Error("Missing authorization header"))
            throw new Error('Missing authorization header')
        }
    }

    app.decorate('verifyToken', verifyToken)

    app.decorate('verifyTokenOrSession', async function (request, reply) {
        // Order is important, other way round breaks nr-auth plugin
        try {
            if (request.sid) {
                await verifySession(request, reply)
            } else if (request.headers && request.headers.authorization) {
                await verifyToken(request, reply)
            } else if (!request.context.config.allowAnonymous) {
                reply.code(401).send({ error: 'unauthorized' })
            }
        } catch (err) {
            reply.code(401).send({ error: 'unauthorized' })
        }
    })

    /**
     * preHandler function that ensures the current request comes from an active
     * session.
     *
     * Currently this is based only on session cookie. This needs expanding
     * to include authorisation tokens.
     *
     * It sets `request.session` to the active session object.
     * @name verifySession
     * @static
     * @memberof forge
     */
    async function verifySession (request, reply) {
        if (request.sid) {
            request.session = await app.db.controllers.Session.getOrExpire(request.sid)
            if (request.session && request.session.User) {
                return
            }
        }
        if (request.context.config.allowAnonymous) {
            return
        }
        reply.code(401).send({ error: 'unauthorized' })
        throw new Error()
    }
    app.decorate('verifySession', verifySession)

    /**
     * preHandler function that ensures the current request comes from
     * an admin user.
     *
     * @name verifyAdmin
     * @static
     * @memberof forge
     */
    app.decorate('verifyAdmin', async (request, reply) => {
        if (request.session && request.session.User.admin) {
            return
        }
        reply.code(401).send({ error: 'unauthorized' })
        return new Error()
    })

    app.decorateRequest('session', null)
    app.decorateRequest('sid', null)

    // Extract the session cookie and attach as request.sid
    app.addHook('onRequest', async (request, reply) => {
        if (request.cookies.sid) {
            const sid = reply.unsignCookie(request.cookies.sid)
            if (sid.valid) {
                request.sid = sid.value
            } else {
                reply.clearCookie('sid')
            }
        }
    })

    // app.post('/account/register', (request, reply) => {
    //
    // })

    /**
     * Login a user.
     *
     * Requires a body containing:
     *
     * ```json
     * {
     *    "username": "username",
     *    "password": "password"
     * }
     * ```
     * @name /account/login
     * @static
     * @memberof forge.routes.session
     */
    app.post('/account/login', {
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                    remember: { type: 'boolean', default: false }
                }
            }
        },
        logLevel: 'warn'
    }, async (request, reply) => {
        const result = await app.db.controllers.User.authenticateCredentials(request.body.username, request.body.password)
        if (result) {
            const session = await app.db.controllers.Session.createUserSession(request.body.username)
            if (session) {
                const cookieOptions = { ...SESSION_COOKIE_OPTIONS }
                if (request.body.remember) {
                    cookieOptions.maxAge = SESSION_MAX_AGE
                }
                reply.setCookie('sid', session.sid, cookieOptions)
                reply.send({ status: 'okay' })
                return
            }
        }
        reply.code(401).send({ error: 'unauthorized' })
    })

    /**
     * @name /account/logout
     * @static
     * @memberof forge.routes.session
     */
    app.post('/account/logout', { logLevel: 'warn' }, async (request, reply) => {
        if (request.sid) {
            // logout:nodered(step-1)
            const thisSession = await app.db.models.Session.findOne({
                where: { sid: request.sid },
                include: app.db.models.User
            })
            const userId = thisSession?.UserId
            if (userId != null) {
                const user = await app.db.models.User.byId(userId)
                const sessions = await app.db.models.StorageSession.byUsername(user.username)
                for (let index = 0; index < sessions.length; index++) {
                    const session = sessions[index]
                    const ProjectId = session.ProjectId
                    const project = await app.db.models.Project.byId(ProjectId)
                    for (let index = 0; index < session.sessions.length; index++) {
                        const token = session.sessions[index].accessToken
                        try {
                            await app.containers.revokeUserToken(project, token) // logout:nodered(step-2)
                        } catch (error) {
                            app.log.warn(`Failed to revoke token for Project ${ProjectId}: ${error.toString()}`) // log error but continue to delete session
                        }
                    }
                }
            }
            await app.db.controllers.Session.deleteSession(request.sid)
        }
        reply.clearCookie('sid')
        reply.send({ status: 'okay' })
    })

    /**
     * @name /account/register
     * @static
     * @memberof forge.routes.session
     */
    app.post('/account/register', {
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password', 'name', 'email'],
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' }
                }
            }
        },
        logLevel: 'warn'
    }, async (request, reply) => {
        if (!app.settings.get('user:signup') && !app.settings.get('team:user:invite:external')) {
            reply.code(400).send({ error: 'user registration not enabled' })
            return
        }
        if (!app.settings.get('user:signup') && app.settings.get('team:user:invite:external')) {
            // External invites are allowed - so check there is an invite for this email
            const invite = await app.db.models.Invitation.forExternalEmail(request.body.email)
            if (!invite || invite.length === 0) {
                // reusing error message so as not to leak invited users
                reply.code(400).send({ error: 'user registration not enabled' })
                return
            } else {
                app.log.info(`Invited user found ${request.body.email}`)
            }
        }
        if (!app.postoffice.enabled()) {
            reply.code(400).send({ error: 'user registration not enabled - email not configured' })
            return
        }

        if (/^(admin|root)$/.test(request.body.username)) {
            reply.code(400).send({ error: 'invalid username' })
            return
        }
        try {
            const newUser = await app.db.models.User.create({
                username: request.body.username,
                name: request.body.name,
                email: request.body.email,
                email_verified: false,
                password: request.body.password,
                admin: false
            })
            const verifyToken = await app.db.controllers.User.generateEmailVerificationToken(newUser)
            await app.postoffice.send(
                newUser,
                'VerifyEmail',
                {
                    confirmEmailLink: `${app.config.base_url}/account/verify/${verifyToken}`
                }
            )
            reply.send({ status: 'okay' })
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            reply.code(400).send({ error: responseMessage })
        }
    })

    app.get('/account/verify/:token', { logLevel: 'warn' }, async (request, reply) => {
        try {
            let sessionUser
            if (request.sid) {
                request.session = await app.db.controllers.Session.getOrExpire(request.sid)
                sessionUser = request.session.User
            }
            const verifiedUser = await app.db.controllers.User.verifyEmailToken(sessionUser, request.params.token)

            if (app.settings.get('user:team:auto-create')) {
                await app.db.controllers.Team.createTeamForUser({
                    name: `Team ${verifiedUser.name}`,
                    slug: verifiedUser.username
                }, verifiedUser)
            }

            const pendingInvitations = await app.db.models.Invitation.forExternalEmail(verifiedUser.email)
            for (let i = 0; i < pendingInvitations.length; i++) {
                const invite = pendingInvitations[i]
                // For now we'll auto-accept any invites for this user
                // See https://github.com/flowforge/flowforge/issues/275#issuecomment-1040113991
                await app.db.controllers.Invitation.acceptInvitation(invite, verifiedUser)
                // // If we go back to having the user be able to accept invites
                // // as a secondary step, the following code will convert the external
                // // invite into an internal one.
                // invite.external = false
                // invite.inviteeId = verifiedUser.id
                // await invite.save()
            }

            reply.redirect('/')
        } catch (err) {
            console.log(err.toString())
            reply.code(400).send({ status: 'error', message: err.toString() })
        }
    })

    app.post('/account/verify', { preHandler: app.verifySession, logLevel: 'warn' }, async (request, reply) => {
        if (!app.postoffice.enabled()) {
            reply.code(400).send({ error: 'email not configured' })
            return
        }
        if (!request.session.User.email_verified) {
            const verifyToken = await app.db.controllers.User.generateEmailVerificationToken(request.session.User)
            await app.postoffice.send(
                request.session.User,
                'VerifyEmail',
                {
                    confirmEmailLink: `${app.config.base_url}/account/verify/${verifyToken}`
                }
            )
            reply.send({ status: 'okay' })
        } else {
            reply.code(400).send({ status: 'error', message: 'Email already verified' })
        }
    })

    app.post('/account/forgot_password', {
        schema: {
            body: {
                type: 'object',
                required: ['email'],
                properties: {
                    email: { type: 'string' }
                }
            }
        },
        logLevel: 'warn'
    }, async (request, reply) => {
        if (!app.settings.get('user:reset-password')) {
            reply.code(400).send({ error: 'password reset not enabled' })
            return
        }
        const user = await app.db.models.User.byEmail(request.body.email)
        if (user) {
            if (app.postoffice.enabled()) {
                const token = await app.db.controllers.AccessToken.createTokenForPasswordReset(user)
                app.postoffice.send(
                    user,
                    'PasswordReset',
                    {
                        resetLink: `${app.config.base_url}/account/change-password/${token.token}`
                    }
                )
            } else {
                reply.code(400).send({ status: 'error', message: 'Email not enabled - cannot reset password' })
                return
            }
        }
        reply.code(200).send({})
    })

    app.post('/account/reset_password/:token', {
        schema: {
            body: {
                type: 'object',
                required: ['password'],
                properties: {
                    password: { type: 'string' }
                }
            }
        },
        logLevel: 'warn'
    }, async (request, reply) => {
        if (!app.settings.get('user:reset-password')) {
            reply.code(400).send({ error: 'password reset not enabled' })
            return
        }

        // We swallow all errors in this handler and always return 200
        // This ensures we don't leak any information about valid/invalid requests

        const token = await app.db.controllers.AccessToken.getOrExpirePasswordResetToken(request.params.token)
        let success = false
        if (token) {
            // This is a valid password reset token
            const user = await app.db.models.User.byId(token.ownerId)
            if (user) {
                try {
                    await app.db.controllers.User.resetPassword(user, request.body.password)
                    success = true
                } catch (err) {
                }
            }
            // We've used the one attempt to use this token - remove it
            await token.destroy()
        }
        if (success) {
            reply.code(200).send({})
        } else {
            reply.code(400).send({ status: 'error', message: 'Password reset failed' })
        }
    })

    done()
})
