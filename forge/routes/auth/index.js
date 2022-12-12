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

// This defines how long the session cookie is valid for. This should match
// the max session age defined in `forge/db/controllers/Session.DEFAULT_WEB_SESSION_EXPIRY
// albeit in secs not millisecs due to cookie maxAge requirements
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 1 week in seconds

// Options to apply to our session cookie
const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    path: '/',
    signed: true,
    maxAge: SESSION_MAX_AGE
}

module.exports = fp(async function (app, opts, done) {
    await app.register(require('./oauth'), { logLevel: app.config.logging.http })
    await app.register(require('./permissions'))

    /**
     * preHandler function that ensures the current request comes from an active
     * session or token
     *
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
                const emailVerified = !app.postoffice.enabled() || request.session.User.email_verified || request.routeConfig.allowUnverifiedEmail
                const passwordNotExpired = !request.session.User.password_expired || request.routeConfig.allowExpiredPassword
                const suspended = request.session.User.suspended
                if (emailVerified && passwordNotExpired && !suspended) {
                    return
                }
            }
        } else if (request.headers && request.headers.authorization) {
            const parts = request.headers.authorization.split(' ')
            if (parts.length === 2) {
                const scheme = parts[0]
                const token = parts[1]
                if (scheme !== 'Bearer') {
                    reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                    return
                }
                const accessToken = await app.db.controllers.AccessToken.getOrExpire(token)
                if (accessToken) {
                    request.session = {
                        ownerId: accessToken.ownerId,
                        ownerType: accessToken.ownerType,
                        scope: accessToken.scope
                    }
                    if (accessToken.ownerType === 'user') {
                        request.session.User = await app.db.models.User.findOne({ where: { id: parseInt(accessToken.ownerId) } })
                        // Unlike a cookie based session, we'll allow user tokens to continue
                        // working if password has expired or email isn't verified
                        // TODO: validate this choice
                        if (request.session.User.suspended) {
                            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                            return
                        }
                    }
                    return
                }
                reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                return
            } else {
                reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                return
            }
        }
        if (request.routeConfig.allowAnonymous) {
            return
        }
        reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
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
        if (request.session?.User?.admin) {
            return
        }
        reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
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

    app.decorate('createSessionCookie', async function (username) {
        const session = await app.db.controllers.Session.createUserSession(username)
        if (session) {
            const cookieOptions = { ...SESSION_COOKIE_OPTIONS }
            cookieOptions.maxAge = SESSION_MAX_AGE
            return {
                session,
                cookieOptions
            }
        } else {
            return null
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
                required: ['username'],
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string' }
                }
            }
        },
        logLevel: app.config.logging.http
    }, async (request, reply) => {
        if (app.config.features.enabled('sso')) {
            if (await app.sso.handleLoginRequest(request, reply)) {
                // The request has been handled at the SSO layer. Do nothing else
                return
            }
        }
        if (!request.body.password) {
            reply.code(401).send({ code: 'password_required', error: 'Password required' })
        } else {
            const userInfo = app.auditLog.formatters.userObject(request.body)
            const result = await app.db.controllers.User.authenticateCredentials(request.body.username, request.body.password)
            if (result) {
                const sessionInfo = await app.createSessionCookie(request.body.username)
                if (sessionInfo) {
                    userInfo.id = sessionInfo.session.UserId
                    // TODO: add more info to userInfo for user logging in
                    // userInfo.email = session.User?.email
                    // userInfo.name = session.User?.name
                    reply.setCookie('sid', sessionInfo.session.sid, sessionInfo.cookieOptions)
                    await app.auditLog.User.account.login(userInfo, null)
                    reply.send()
                    return
                } else {
                    const resp = { code: 'user_suspended', error: 'User Suspended' }
                    await app.auditLog.User.account.login(userInfo, resp, userInfo)
                    reply.code(403).send(resp)
                    return
                }
            }
            const resp = { code: 'unauthorized', error: 'unauthorized' }
            await app.auditLog.User.account.login(userInfo, resp, userInfo)
            reply.code(401).send(resp)
        }
    })

    /**
     * @name /account/logout
     * @static
     * @memberof forge.routes.session
     */
    app.post('/account/logout', async (request, reply) => {
        let userInfo = null
        if (request.sid) {
            // logout:nodered(step-1)
            const thisSession = await app.db.models.Session.findOne({
                where: { sid: request.sid },
                include: app.db.models.User
            })
            userInfo = app.auditLog.formatters.userObject(thisSession?.User)
            userInfo.id = thisSession?.UserId
            if (userInfo.id != null) {
                const user = await app.db.models.User.byId(userInfo.id)
                userInfo = app.auditLog.formatters.userObject(user)
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
        await app.auditLog.User.account.logout(userInfo)
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
        logLevel: app.config.logging.http
    }, async (request, reply) => {
        const userInfo = app.auditLog.formatters.userObject(request.body)
        if (!app.settings.get('user:signup') && !app.settings.get('team:user:invite:external')) {
            const resp = { code: 'user_registration_unavailable', error: 'user registration not enabled' }
            await app.auditLog.User.account.register(userInfo, resp, userInfo)
            reply.code(400).send(resp)
            return
        }
        if (!app.settings.get('user:signup') && app.settings.get('team:user:invite:external')) {
            // External invites are allowed - so check there is an invite for this email
            const invite = await app.db.models.Invitation.forExternalEmail(request.body.email)
            if (!invite || invite.length === 0) {
                // reusing error message so as not to leak invited users
                const resp = { code: 'user_registration_unavailable', error: 'user registration not enabled' }
                await app.auditLog.User.account.register(userInfo, resp, userInfo)
                reply.code(400).send(resp)
                return
            } else {
                app.log.info(`Invited user found ${request.body.email}`)
            }
        }
        if (!app.postoffice.enabled()) {
            const resp = { code: 'user_registration_unavailable', error: 'user registration not enabled - email not configured' }
            await app.auditLog.User.account.register(userInfo, resp, userInfo)
            reply.code(400).send(resp)
            return
        }

        if (/^(admin|root)$/.test(request.body.username)) {
            const resp = { code: 'invalid_username', error: 'invalid username' }
            await app.auditLog.User.account.register(userInfo, resp, userInfo)
            reply.code(400).send(resp)
            return
        }
        if (app.settings.get('user:tcs-required') && !request.body.tcs_accepted) {
            const resp = { code: 'tcs_missing', error: 'terms and conditions not accepted' }
            await app.auditLog.User.account.register(userInfo, resp, userInfo)
            reply.code(400).send(resp)
            return
        }
        try {
            const newUser = await app.db.models.User.create({
                username: request.body.username,
                name: request.body.name,
                email: request.body.email,
                email_verified: false,
                password: request.body.password,
                admin: false,
                tcs_accepted: new Date()
            })
            userInfo.id = newUser.id
            const verificationToken = await app.db.controllers.User.generateEmailVerificationToken(newUser)
            await app.postoffice.send(
                newUser,
                'VerifyEmail',
                {
                    confirmEmailLink: `${app.config.base_url}/account/verify/${verificationToken}`
                }
            )
            if (request.body.code) {
                reply.setCookie('ff_coupon', request.body.code, {
                    path: '/',
                    maxAge: (60 * 60 * 24 * 7),
                    sameSite: true,
                    signed: true,
                    secure: 'auto'
                })
            }
            await app.auditLog.User.account.register(userInfo, null, userInfo)
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
            await app.auditLog.User.account.register(userInfo, resp, userInfo)
            reply.code(400).send(resp)
        }
    })

    /**
     * Perform email verification
     */
    app.post('/account/verify/:token', async (request, reply) => {
        try {
            if (app.settings.get('user:team:auto-create')) {
                const teamLimit = app.license.get('teams')
                const teamCount = await app.db.models.Team.count()
                if (teamCount >= teamLimit) {
                    const resp = { code: 'team_limit_reached', error: 'Unable to auto create user team: license limit reached' }
                    await app.auditLog.User.account.verify.verifyToken(request.session.User, resp)
                    reply.code(400).send(resp)
                    return
                }
            }
            let sessionUser
            if (request.sid) {
                request.session = await app.db.controllers.Session.getOrExpire(request.sid)
                sessionUser = request.session?.User
            }
            let verifiedUser
            try {
                verifiedUser = await app.db.controllers.User.verifyEmailToken(sessionUser, request.params.token)
            } catch (err) {
                const resp = { code: 'invalid_request', error: err.toString() }
                await app.auditLog.User.account.verify.verifyToken(request.session?.User, resp)
                reply.code(400).send(resp)
                return
            }

            // only create a personal team if no other teams exist
            if (app.settings.get('user:team:auto-create') && !((await app.db.models.Team.forUser(verifiedUser)).length)) {
                const team = await app.db.controllers.Team.createTeamForUser({
                    name: `Team ${verifiedUser.name}`,
                    slug: verifiedUser.username,
                    TeamTypeId: (await app.db.models.TeamType.byName('starter')).id
                }, verifiedUser)
                await app.auditLog.User.account.verify.autoCreateTeam(request.session?.User || verifiedUser, null, team)
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
            await app.auditLog.User.account.verify.verifyToken(request.session?.User || verifiedUser, null)
            reply.send({ status: 'okay' })
        } catch (err) {
            app.log.error(`/account/verify/token error - ${err.toString()}`)
            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.User.account.verify.verifyToken(request.session?.User, resp)
            reply.code(400).send(resp)
        }
    })

    /**
     * Generate verification email
     */
    app.post('/account/verify', { preHandler: app.verifySession, config: { allowUnverifiedEmail: true } }, async (request, reply) => {
        if (!app.postoffice.enabled()) {
            const resp = { code: 'invalid_request', error: 'email not configured' }
            await app.auditLog.User.account.verify.requestToken(request.session?.User, resp)
            reply.code(400).send(resp)
            return
        }
        if (!request.session.User.email_verified) {
            const verificationToken = await app.db.controllers.User.generateEmailVerificationToken(request.session.User)
            await app.postoffice.send(
                request.session.User,
                'VerifyEmail',
                {
                    confirmEmailLink: `${app.config.base_url}/account/verify/${verificationToken}`
                }
            )
            await app.auditLog.User.account.verify.requestToken(request.session.User, null)
            reply.send({ status: 'okay' })
        } else {
            const resp = { code: 'invalid_request', error: 'email already verified' }
            await app.auditLog.User.account.verify.requestToken(request.session?.User, resp)
            reply.code(400).send(resp)
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
        logLevel: app.config.logging.http
    }, async (request, reply) => {
        const userInfo = app.auditLog.formatters.userObject(request.session?.User || request.body)
        if (!app.settings.get('user:reset-password')) {
            const resp = { code: 'password_reset_unavailable', error: 'password reset not enabled' }
            await app.auditLog.User.account.forgotPassword(userInfo, resp, userInfo)
            reply.code(400).send(resp)
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
                const info = `Password reset request for ${user.hashid}`
                app.log.info(info)
                await app.auditLog.User.account.forgotPassword(userInfo, null, userInfo)
            } else {
                const resp = { code: 'password_reset_unavailable', error: 'Email not enabled - cannot reset password' }
                await app.auditLog.User.account.forgotPassword(userInfo, resp, userInfo)
                reply.code(400).send({ status: 'error', message: resp.error, ...resp })
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
        logLevel: app.config.logging.http
    }, async (request, reply) => {
        let userInfo = app.auditLog.formatters.userObject(request.session?.User)
        if (!app.settings.get('user:reset-password')) {
            const resp = { code: 'password_reset_unavailable', error: 'password reset not enabled' }
            await app.auditLog.User.account.resetPassword(userInfo, resp, userInfo)
            reply.code(400).send(resp)
            return
        }

        // We swallow all errors in this handler and always return 200
        // This ensures we don't leak any information about valid/invalid requests

        const token = await app.db.controllers.AccessToken.getOrExpirePasswordResetToken(request.params.token)
        let success = false
        if (token) {
            userInfo.hashid = token.ownerId
            // This is a valid password reset token
            const user = await app.db.models.User.byId(token.ownerId)
            if (user) {
                userInfo = user
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
            await app.auditLog.User.account.resetPassword(request.session?.User || userInfo, null, userInfo)
            reply.code(200).send({})
        } else {
            const resp = { code: 'password_reset_failed', error: 'Password reset failed' }
            await app.auditLog.User.account.resetPassword(request.session?.User || userInfo, resp, userInfo)
            reply.code(400).send({ status: 'error', message: resp.error, ...resp })
        }
    })

    done()
})
