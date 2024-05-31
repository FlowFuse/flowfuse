const { Authenticator } = require('@fastify/passport')
const { MultiSamlStrategy } = require('@node-saml/passport-saml')
const fp = require('fastify-plugin')

module.exports = fp(async function (app, opts) {
    app.addHook('onRequest', async (request, reply) => {
        if (!request.session) {
            // passport expects request.session to exist and to be able to store
            // state. We don't need to use that, but we need to ensure we have
            // the api in place otherwise passport will complain.
            request.session = {
                get: key => { return null },
                set: (key, value) => { return null }
            }
        }
    })

    const fastifyPassport = new Authenticator()

    // We don't use @fastify/session, but this is needed to let passport think
    // we are using it
    fastifyPassport.registerUserSerializer(async (user, request) => user)

    app.register(require('@fastify/formbody'))
    // app.register(fastifySession, { secret: 'secret with minimum length of 32 characters' })
    app.register(fastifyPassport.initialize())
    app.register(fastifyPassport.secureSession())

    app.setErrorHandler(function (error, request, reply) {
        // TODO: how to surface errors properly
        app.log.error(`SAML Login error: ${error.toString()}`)
        reply.redirect('/')
    })

    fastifyPassport.use(new MultiSamlStrategy({
        passReqToCallback: true, // makes req available in callback,
        disableRequestedAuthnContext: true, // Helps make things work with Entra
        wantAssertionsSigned: false, // TODO: allow this to be set per provider
        async getSamlOptions (request, done) {
            if (request.body?.RelayState) {
                // This is an in-flight request. We previously stored the SAML provider
                // id in RelayState - which should get returned to us here.
                // Use that to get back the right SAML options
                const state = JSON.parse(request.body.RelayState)
                const opts = await app.sso.getProviderOptions(state.provider)
                if (opts) {
                    done(null, opts)
                } else {
                    done(new Error(`Unknown SAML provider: ${state.provider}`))
                }
                return
            }
            if (request.query.u) {
                // This is an initial request to start a SAML flow. The user
                // email is provided as a query parameter 'u'
                const providerId = await app.sso.getProviderForEmail(request.query.u)
                const opts = await app.sso.getProviderOptions(providerId)
                if (opts) {
                    request.query.RelayState = JSON.stringify({
                        provider: providerId,
                        redirectTo: decodeURIComponent(request.query.r || '/')
                    })
                    done(null, opts)
                    return
                } else {
                    done(new Error(`No matching SAML provider for email ${request.query.u}`))
                    return
                }
            }
            done(new Error('Missing u query parameter'))
        }
    }, async (request, samlUser, done) => {
        if (samlUser.nameID) {
            // console.log(profile)
            const user = await app.db.models.User.byUsernameOrEmail(samlUser.nameID)
            if (user) {
                const state = JSON.parse(request.body.RelayState)
                const providerOpts = await app.sso.getProviderOptions(state.provider)
                if (providerOpts.groupMapping) {
                    // This SSO provider is configured to manage team membership.
                    try {
                        await app.sso.updateTeamMembership(samlUser, user, providerOpts)
                    } catch (err) {
                        done(err)
                        return
                    }
                }
                done(null, user)
            } else {
                const unknownError = new Error(`Unknown user: ${samlUser.nameID}`)
                unknownError.code = 'unknown_sso_user'
                const userInfo = app.auditLog.formatters.userObject({ email: samlUser.nameID })
                const resp = { code: 'unknown_sso_user', error: 'unauthorized' }
                await app.auditLog.User.account.login(userInfo, resp, userInfo)
                done(unknownError)
            }
        } else {
            const missingNameIDError = new Error('SAML response missing nameID')
            missingNameIDError.code = 'unknown_sso_user'
            done(missingNameIDError)
        }
    }))

    app.get('/ee/sso/login', {
        config: { allowAnonymous: true },
        preValidation: fastifyPassport.authenticate('saml', { session: false })
    }, async (request, reply, err, user, info, status) => {
        // Should never get here as passport will trigger the saml flow
        // and either result in the error handler, or a POST to /sso/login/callback below
        reply.redirect('/')
    })

    app.post('/ee/sso/login/callback', {
        config: { allowAnonymous: true },
        preValidation: fastifyPassport.authenticate('saml', { session: false })
    }, async (request, reply, err, user, info, status) => {
        if (request.user) {
            const userInfo = app.auditLog.formatters.userObject(request.user)
            // They have completed authentication and we know who they are.
            const sessionInfo = await app.createSessionCookie(request.user.email)
            if (sessionInfo) {
                request.user.sso_enabled = true
                request.user.email_verified = true
                if (request.user.mfa_enabled) {
                    // They are mfa_enabled - but have authenticated via SSO
                    // so we will let them in without further challenge
                    sessionInfo.session.mfa_verified = true
                    await sessionInfo.session.save()
                }
                await request.user.save()
                userInfo.id = sessionInfo.session.UserId
                reply.setCookie('sid', sessionInfo.session.sid, sessionInfo.cookieOptions)
                await app.auditLog.User.account.login(userInfo, null)
                let redirectTo = '/'
                if (request.body?.RelayState) {
                    const state = JSON.parse(request.body.RelayState)
                    redirectTo = /^\/.*/.test(state.redirectTo) ? state.redirectTo : '/'
                }
                reply.redirect(redirectTo)
                return
            } else {
                const resp = { code: 'user_suspended', error: 'User Suspended' }
                await app.auditLog.User.account.login(userInfo, resp, userInfo)
                // TODO: how to surface errors
                reply.redirect('/')
                return
            }
        }
        throw new Error('Invalid SAML response')
    })
}, { name: 'app.ee.routes.sso.auth' })
