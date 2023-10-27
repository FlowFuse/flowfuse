const { Authenticator } = require('@fastify/passport')
const { MultiSamlStrategy } = require('@node-saml/passport-saml')
const fp = require('fastify-plugin')

module.exports = fp(async function (app, opts, done) {
    app.addHook('onRequest', async (request, reply) => {
        if (!request.session) {
            // passport expects request.session to exist and to be able to store
            // state. We don't need to use that, but we need to ensure we have
            // the api in place otherwise passport will complain.
            request.session = {
                get: (key) => {
                    return null
                },
                set: (key, value) => {
                    return null
                }
            }
        }
    })

    const fastifyPassport = new Authenticator()
    let providerOptions = {}

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

    fastifyPassport.use(
        new MultiSamlStrategy(
            {
                passReqToCallback: true, // makes req available in callback,
                wantAssertionsSigned: false, // TODO: allow this to be set per provider
                async getSamlOptions (request, done) {
                    if (request.body?.RelayState) {
                        // This is an in-flight request. We previously stored the SAML provider
                        // id in RelayState - which should get returned to us here.
                        // Use that to get back the right SAML options
                        const state = JSON.parse(request.body.RelayState)
                        const opts = await app.sso.getProviderOptions(state.provider)
                        if (opts) {
                            providerOptions = opts
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
            },
            async (req, profile, done) => {
                if (profile.nameID) {
                    const user = await app.db.models.User.byUsernameOrEmail(profile.nameID)
                    const userInfo = app.auditLog.formatters.userObject({ email: profile.nameID })
                    const samlGroups = JSON.stringify(profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'])
                    const displayName = profile['http://schemas.microsoft.com/identity/claims/displayname']
                    if (user) {
                        user.saml_groups = samlGroups
                        user.name = displayName

                        if (providerOptions.allowAllSSO) {
                            done(null, user)
                        } else if (samlGroups.includes(providerOptions.samlAdminGroup)) {
                            user.admin = true
                            await app.auditLog.User.account.samlAdminLogin(userInfo, null)
                        } else if (samlGroups.includes(providerOptions.samlUserGroup)) {
                            user.admin = false
                        } else {
                            done(new Error('Not assigned to a User or Admin group'))
                        }
                        done(null, user)
                    } else if (providerOptions.autoCreateUser) {
                        app.log.info('Create new user')

                        let createUser = false
                        let admin = false

                        if (providerOptions.allowAllSSO) {
                            createUser = true
                        } else if (samlGroups.includes(providerOptions.samlAdminGroup)) {
                            admin = true
                            createUser = true
                            await app.auditLog.User.account.samlAdminLogin(userInfo, null)
                        } else if (samlGroups.includes(providerOptions.samlUserGroup)) {
                            createUser = true
                        } else {
                            done(new Error('Not assigned to a User or Admin group'))
                        }
                        if (createUser) {
                            const newUser = await app.db.models.User.create({
                                username: profile.nameID,
                                name: displayName,
                                email: profile.nameID,
                                email_verified: true,
                                sso_enabled: true,
                                saml_groups: samlGroups,
                                password: generateRandomString(),
                                admin: !!admin
                            })

                            done(null, newUser)
                        }
                    } else {
                        const unknownError = new Error(`Unknown user: ${profile.nameID}`)
                        unknownError.code = 'unknown_sso_user'
                        const userInfo = app.auditLog.formatters.userObject({ email: profile.nameID })
                        const resp = { code: 'unknown_sso_user', error: 'unauthorized' }
                        await app.auditLog.User.account.login(userInfo, resp, userInfo)
                        done(unknownError)
                    }
                } else {
                    const missingNameIDError = new Error('SAML response missing nameID')
                    missingNameIDError.code = 'unknown_sso_user'
                    done(missingNameIDError)
                }
            }
        )
    )

    function generateRandomString (length = 16) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let result = ''

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length)
            result += characters[randomIndex]
        }

        return result
    }

    app.get(
        '/ee/sso/login',
        {
            config: { allowAnonymous: true },
            preValidation: fastifyPassport.authenticate('saml', { session: false })
        },
        async (request, reply, err, user, info, status) => {
            // Should never get here as passport will trigger the saml flow
            // and either result in the error handler, or a POST to /sso/login/callback below
            reply.redirect('/')
        }
    )

    app.get('/ee/sso/auth-settings', { preHandler: skipAuthForThisRoute }, async (request, reply) => {
        const provider = await app.sso.getDefaultProvider()
        reply.send({ ssoRedirect: provider.getOptions().defaultLogin, domainFilter: provider.domainFilter })
    })

    function skipAuthForThisRoute (request, reply, done) {
        // Logic to skip authentication
        done() // Proceed to the next hook/route handler
    }

    app.post(
        '/ee/sso/login/callback',
        {
            config: { allowAnonymous: true },
            preValidation: fastifyPassport.authenticate('saml', { session: false })
        },
        async (request, reply, err, user, info, status) => {
            if (request.user) {
                const userInfo = app.auditLog.formatters.userObject(request.user)
                // They have completed authentication and we know who they are.
                const sessionInfo = await app.createSessionCookie(request.user.email)
                if (sessionInfo) {
                    request.user.sso_enabled = true
                    request.user.email_verified = true
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
        }
    )
    done()
})
