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
const crypto = require('crypto')

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

// create jsdoc typedef for UserController
/**
 * @typedef {import('../../db/controllers/User')} UserController
 */

module.exports = fp(init, { name: 'app.routes.auth' })

/**
 * Initialize the auth plugin
 * @param {import('forge/forge').ForgeApplication} app
 * @param {Object} opts
 * @param {Function} done
 */
async function init (app, opts) {
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
                const emailVerified = !app.postoffice.enabled() || request.session.User.email_verified || request.routeOptions.config.allowUnverifiedEmail
                const passwordNotExpired = !request.session.User.password_expired || request.routeOptions.config.allowExpiredPassword
                const suspended = request.session.User.suspended
                // If the user has mfa_enabled, but the session isn't marked as mfa_verified then
                // the user has not completed logging in so the session isn't valid
                const mfaMissing = request.session.User.mfa_enabled && !request.session.mfa_verified

                if (emailVerified && passwordNotExpired && !suspended && !mfaMissing) {
                    return
                }
                if (request.routeOptions.config.allowAnonymous) {
                    return
                }
                await request.session.destroy()
                reply.clearCookie('sid')
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
                    if (accessToken.ownerType === 'team' && request.session.scope?.includes('device:provision')) {
                        request.session.provisioning = await app.db.views.AccessToken.provisioningTokenSummary(accessToken)
                    }
                    if (accessToken.ownerType === 'device' && request.session.scope?.includes('device:otc')) {
                        request.session.provisioning = {
                            otcSetup: true,
                            deviceId: +accessToken.ownerId // convert to number
                        }
                        // delete one time code immediately (spent)
                        await accessToken.destroy()
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
                        if (accessToken.name) {
                            // Temp hack to give token full user scope
                            delete request.session.scope
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
        if (request.routeOptions.config.allowAnonymous) {
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
        config: {
            rateLimit: app.config.rate_limits
                ? {
                    max: 5,
                    timeWindow: 30000,
                    keyGenerator: app.config.rate_limits.keyGenerator,
                    hard: true
                }
                : false
        },
        schema: {
            summary: 'Log in to the platform',
            description: 'Log in to the platform. If SSO is enabled for this user, the response will prompt the user to retry via the SSO login mechanism.',
            tags: ['Authentication', 'X-HIDDEN'],
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
                    if (sessionInfo.session.User.mfa_enabled && !sessionInfo.mfa_verified) {
                        reply.code(403).send({ code: 'mfa_required', error: 'MFA required' })
                        return
                    }
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
    app.post('/account/login/token', {
        config: {
            rateLimit: app.config.rate_limits // rate limit this route regardless of global/per-route mode (if enabled)
        },
        schema: {
            summary: 'Verify a users MFA token',
            tags: ['Authentication', 'X-HIDDEN'],
            body: {
                type: 'object',
                required: ['token'],
                properties: {
                    token: { type: 'string' }
                }
            }
        },
        logLevel: app.config.logging.http
    }, async (request, reply) => {
        // We expect there to be a session at this point - but without a verified mfa token
        if (request.sid) {
            request.session = await app.db.controllers.Session.getOrExpire(request.sid)
            if (request.session) {
                if (await app.db.controllers.User.verifyMFAToken(request.session.User, request.body.token)) {
                    request.session.mfa_verified = true
                    await request.session.save()
                    reply.send()
                    return
                }
                await request.session.destroy()
            }
            reply.clearCookie('sid')
        }
        reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
    })

    /**
     * @name /account/logout
     * @static
     * @memberof forge.routes.session
     */
    app.post('/account/logout', {
        config: {
            rateLimit: false // never rate limit this route
        },
        schema: {
            tags: ['Authentication', 'X-HIDDEN']
        }
    }, async (request, reply) => {
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
                await app.db.controllers.User.logout(user)
            }
            await app.db.controllers.Session.deleteSession(request.sid)
        }
        reply.clearCookie('sid')
        if (userInfo?.id || userInfo?.name || userInfo?.username) {
            await app.auditLog.User.account.logout(userInfo)
        }
        reply.send({ status: 'okay' })
    })

    /**
     * @name /account/register
     * @static
     * @memberof forge.routes.session
     */
    app.post('/account/register', {
        config: {
            rateLimit: app.config.rate_limits
                ? {
                    max: 5,
                    timeWindow: 30000,
                    keyGenerator: app.config.rate_limits.keyGenerator,
                    hard: true
                }
                : false
        },
        schema: {
            tags: ['Authentication', 'X-HIDDEN'],
            body: {
                type: 'object',
                required: ['username', 'password', 'name', 'email'],
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    code: { type: 'string' }
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

        if (/^(admin|root)$/.test(request.body.username) || !/^[a-z0-9-_]+$/i.test(request.body.username)) {
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
        const userProperties = {
            username: request.body.username,
            name: request.body.name,
            email: request.body.email,
            email_verified: false,
            password: request.body.password,
            admin: false,
            tcs_accepted: new Date()
        }
        let requireEmailVerification = true
        if (app.config.features.enabled('sso') && request.body.email) {
            if (await app.sso.isSSOEnabledForEmail(request.body.email)) {
                // This user is signing up with an SSO enabled email domain
                // 1. validate they are not trying to use a plus-address (name+extra@domain)
                if (/^.*\+.*@[^@]+$/.test(request.body.email)) {
                    const resp = { code: 'invalid_sso_email', error: 'SSO is enabled for this email domain. You must register using the email that matches exactly what your SSO provider identifies you as.' }
                    await app.auditLog.User.account.register(userInfo, resp, userInfo)
                    reply.code(400).send(resp)
                    return
                }
                requireEmailVerification = false
                userProperties.sso_enabled = true
            }
        }
        try {
            const newUser = await app.db.models.User.create(userProperties)
            userInfo.id = newUser.id
            if (requireEmailVerification) {
                const verificationToken = await app.db.controllers.User.generateEmailVerificationToken(newUser)
                await app.postoffice.send(
                    newUser,
                    'VerifyEmail',
                    {
                        confirmEmailLink: `${app.config.base_url}/account/verify/${verificationToken}`
                    }
                )
            }
            if (app.billing && request.body.code) {
                await app.billing.setUserBillingCode(newUser, request.body.code)
            }
            await app.auditLog.User.account.register(userInfo, null, userInfo)

            if (userProperties.sso_enabled) {
                const pendingInvitations = await app.db.models.Invitation.forExternalEmail(newUser.email)
                for (let i = 0; i < pendingInvitations.length; i++) {
                    const invite = pendingInvitations[i]
                    // For now we'll auto-accept any invites for this user
                    // See https://github.com/FlowFuse/flowfuse/issues/275#issuecomment-1040113991
                    await app.db.controllers.Invitation.acceptInvitation(invite, newUser)
                    // // If we go back to having the user be able to accept invites
                    // // as a secondary step, the following code will convert the external
                    // // invite into an internal one.
                    // invite.external = false
                    // invite.inviteeId = verifiedUser.id
                    // await invite.save()
                }
            }

            reply.send(await app.db.views.User.userProfile(newUser))
        } catch (err) {
            let responseMessage
            let responseCode = 'unexpected_error'
            if (/user_username_lower_unique|Users_username_key/.test(err.parent?.toString())) {
                responseMessage = 'Username or email not available'
                responseCode = 'invalid_request'
            } else if (/user_email_lower_unique|Users_email_key/.test(err.parent?.toString())) {
                responseMessage = 'Username or email not available'
                responseCode = 'invalid_request'
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
    app.post('/account/verify/:token', {
        config: {
            rateLimit: false // never rate limit this route
        },
        schema: {
            tags: ['Authentication', 'X-HIDDEN']
        }
    }, async (request, reply) => {
        try {
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

            if (app.settings.get('user:team:auto-create')) {
                const teamLimit = app.license.get('teams')
                const teamCount = await app.db.models.Team.count()
                if (teamCount >= teamLimit) {
                    const resp = { code: 'team_limit_reached', error: 'Unable to auto create user team: license limit reached' }
                    await app.auditLog.User.account.verify.verifyToken(verifiedUser, resp)
                    reply.code(400).send(resp)
                    return
                }
                // only create a personal team if no other teams exist
                if (!((await app.db.models.Team.forUser(verifiedUser)).length)) {
                    let teamTypeId = app.settings.get('user:team:auto-create:teamType')

                    if (!teamTypeId) {
                        // No team type set - pick the 'first' one based on 'order'
                        const teamTypes = await app.db.models.TeamType.findAll({ where: { active: true }, order: [['order', 'ASC']], limit: 1 })
                        teamTypeId = teamTypes[0].id
                    } else {
                        teamTypeId = app.db.models.TeamType.decodeHashid(teamTypeId)
                    }
                    const teamProperties = {
                        name: `Team ${verifiedUser.name}`,
                        slug: verifiedUser.username,
                        TeamTypeId: teamTypeId
                    }
                    const team = await app.db.controllers.Team.createTeamForUser(teamProperties, verifiedUser)
                    await app.auditLog.Platform.platform.team.created(request.session?.User || verifiedUser, null, team)
                    await app.auditLog.User.account.verify.autoCreateTeam(request.session?.User || verifiedUser, null, team)

                    if (app.license.active() && app.billing) {
                        // This checks to see if the team should be in trial mode
                        await app.billing.setupTrialTeamSubscription(team, verifiedUser)
                    }
                }
            }

            const pendingInvitations = await app.db.models.Invitation.forExternalEmail(verifiedUser.email)
            for (let i = 0; i < pendingInvitations.length; i++) {
                const invite = pendingInvitations[i]
                // For now we'll auto-accept any invites for this user
                // See https://github.com/FlowFuse/flowfuse/issues/275#issuecomment-1040113991
                await app.db.controllers.Invitation.acceptInvitation(invite, verifiedUser)
                // // If we go back to having the user be able to accept invites
                // // as a secondary step, the following code will convert the external
                // // invite into an internal one.
                // invite.external = false
                // invite.inviteeId = verifiedUser.id
                // await invite.save()
            }
            await app.auditLog.User.account.verify.verifyToken(request.session?.User || verifiedUser, null)

            // only create a starting instance if the flag is set and this user and their teams have no instances
            if (app.settings.get('user:team:auto-create:instanceType') &&
             !((await app.db.models.Project.byUser(verifiedUser)).length)) {
                const instanceTypeId = app.settings.get('user:team:auto-create:instanceType')

                const instanceType = await app.db.models.ProjectType.byId(instanceTypeId)
                const instanceStack = await instanceType?.getDefaultStack() || (await instanceType.getProjectStacks())?.[0]
                const instanceTemplate = await app.db.models.ProjectTemplate.findOne({ where: { active: true } })

                const userTeamMemberships = await app.db.models.Team.forUser(verifiedUser)
                if (userTeamMemberships.length <= 0) {
                    console.warn("Flag to auto-create instance is set ('user:team:auto-create:instanceType'), but user has no team, consider setting 'user:team:auto-create'")
                    return reply.send({ status: 'okay' })
                } else if (!instanceType) {
                    throw new Error(`Instance type with id ${instanceTypeId} from 'user:team:auto-create:instanceType' not found`)
                } else if (!instanceStack) {
                    throw new Error(`Unable to find a stack for use with instance type ${instanceTypeId} to auto-create user instance`)
                } else if (!instanceTemplate) {
                    throw new Error('Unable to find the default instance template from which to auto-create user instance')
                }

                const userTeam = userTeamMemberships[0].Team

                const applications = await app.db.models.Application.byTeam(userTeam.id)
                let application
                if (applications.length > 0) {
                    application = applications[0]
                } else {
                    const applicationName = `${verifiedUser.name}'s Application`

                    application = await app.db.models.Application.create({
                        name: applicationName.charAt(0).toUpperCase() + applicationName.slice(1),
                        TeamId: userTeam.id
                    })

                    await app.auditLog.User.account.verify.autoCreateTeam(request.session?.User || verifiedUser, null, application)
                }

                const safeTeamName = userTeam.name.toLowerCase().replace(/[\W_]/g, '-')
                const safeUserName = verifiedUser.username.toLowerCase().replace(/[\W_]/g, '-')

                const instanceProperties = {
                    name: `${safeTeamName}-${safeUserName}-${crypto.randomBytes(4).toString('hex')}`
                }

                const instance = await app.db.controllers.Project.create(userTeam, application, verifiedUser, instanceType, instanceStack, instanceTemplate, instanceProperties)

                await app.auditLog.User.account.verify.autoCreateInstance(request.session?.User || verifiedUser, null, instance)
            }

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
    app.post('/account/verify', {
        preHandler: function (request, reply, done) {
            // eslint-disable-next-line promise/no-callback-in-promise
            app.verifySession(request, reply).then(() => done()).catch(done)
        },
        config: {
            rateLimit: app.config.rate_limits
                ? {
                    max: 5,
                    timeWindow: 30000,
                    keyGenerator: app.config.rate_limits.keyGenerator,
                    hard: true
                }
                : false,
            allowUnverifiedEmail: true
        },
        schema: {
            tags: ['Authentication', 'X-HIDDEN']
        }
    }, async (request, reply) => {
        /** @type {UserController} */
        const userController = app.db.controllers.User
        if (!app.postoffice.enabled()) {
            const resp = { code: 'invalid_request', error: 'email not configured' }
            await app.auditLog.User.account.verify.requestToken(request.session?.User, resp)
            reply.code(400).send(resp)
            return
        }
        if (!request.session.User.email_verified) {
            const verificationToken = await userController.generateEmailVerificationToken(request.session.User)
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

    /**
     * Perform pending email change
     */
    app.post('/account/email_change/:token', {
        schema: {

            tags: ['Authentication', 'X-HIDDEN']
        }
    }, async (request, reply) => {
        try {
            /** @type {UserController} */
            const userController = app.db.controllers.User
            let sessionUser
            if (request.sid) {
                request.session = await app.db.controllers.Session.getOrExpire(request.sid)
                sessionUser = request.session?.User
            }
            let verifiedUser
            try {
                const originalEmail = sessionUser.email
                // update the users email address
                verifiedUser = await userController.applyPendingEmailChange(sessionUser, request.params.token)
                // send the email changed confirmation email
                const recipient = {
                    name: verifiedUser.name,
                    email: originalEmail,
                    id: verifiedUser.id,
                    hashid: verifiedUser.hashid
                }
                await userController.sendEmailChangedEmail(recipient, originalEmail, verifiedUser.email)
            } catch (err) {
                const resp = { code: 'invalid_request', error: err.toString() }
                await app.auditLog.User.account.changeEmailConfirmed(request.session?.User, resp)
                reply.code(400).send(resp)
                return
            }

            await app.auditLog.User.account.changeEmailConfirmed(request.session?.User || verifiedUser, null)
            reply.send({ status: 'okay' })
        } catch (err) {
            app.log.error(`/account/verify/token error - ${err.toString()}`)
            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.User.account.changeEmailConfirmed(request.session?.User, resp)
            reply.code(400).send(resp)
        }
    })

    app.post('/account/forgot_password', {
        config: {
            rateLimit: app.config.rate_limits
                ? {
                    max: 5,
                    timeWindow: 30000,
                    keyGenerator: app.config.rate_limits.keyGenerator,
                    hard: true
                }
                : false
        },
        schema: {
            tags: ['Authentication', 'X-HIDDEN'],
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
        config: {
            rateLimit: app.config.rate_limits // rate limit this route regardless of global/per-route mode (if enabled)
        },
        schema: {
            tags: ['Authentication', 'X-HIDDEN'],
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
                    // Clear any existing sessions to force a re-login
                    await app.db.controllers.Session.deleteAllUserSessions(user)
                    await app.db.controllers.AccessToken.deleteAllUserPasswordResetTokens(user)
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
}
