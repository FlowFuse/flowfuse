const { Authenticator } = require('@fastify/passport')
const { MultiSamlStrategy } = require('@node-saml/passport-saml')
const fp = require('fastify-plugin')

const { generateUsernameFromEmail, generatePassword, completeSSOSignIn, completeUserSignup } = require('../../../lib/userTeam')

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
        app.log.error(`SAML Login error: ${error.toString()} ${error.stack}`)
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
            } else if (request.query.p) {
                const providerId = request.query.p
                const opts = await app.sso.getProviderOptions(providerId)
                if (opts) {
                    request.query.RelayState = JSON.stringify({
                        provider: providerId,
                        redirectTo: decodeURIComponent(request.query.r || '/')
                    })
                    done(null, opts)
                    return
                } else {
                    done(new Error(`SAML provider for id ${request.query.p} not found`))
                    return
                }
            }
            done(new Error('Missing u query parameter'))
        }
    }, async (request, samlUser, done) => {
        if (samlUser.nameID) {
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
                try {
                    if (providerOpts.exposeGroups) {
                        // get SAML groups
                        user.SSOGroups = app.sso.getUserGroups(samlUser, user, providerOpts)
                        await user.save()
                    } else {
                        user.SSOGroups = null
                        await user.save()
                    }
                } catch (err) {
                    app.log.error(`SAML SSOGroups error: ${err.toString()} ${err.stack}`)
                }
                done(null, user)
            } else {
                const state = JSON.parse(request.body.RelayState)
                const providerOpts = await app.sso.getProviderOptions(state.provider)
                if (providerOpts.provisionNewUsers) {
                    // create new user from content of samlUser if available
                    const userProperties = {
                    //     username: request.body.username,
                    //     name: request.body.name,
                        email: samlUser.nameID,
                        // email_verified: true,
                        password: generatePassword(),
                        admin: false
                        // sso_enabled: true,
                        // Do not set tcs_accepted as the user hasn't accepted the T&Cs yet (if required)
                        // tcs_accepted: new Date()
                    }

                    if (samlUser['http://schemas.microsoft.com/identity/claims/displayname']) {
                        userProperties.name = samlUser['http://schemas.microsoft.com/identity/claims/displayname']
                    } else {
                        userProperties.name = samlUser.nameID.split('@')[0]
                    }

                    userProperties.username = await generateUsernameFromEmail(app, samlUser.nameID)

                    if (providerOpts.exposeGroups) {
                        userProperties.SSOGroups = app.sso.getUserGroups(samlUser, user, providerOpts)
                    }

                    try {
                        // create user
                        const newUser = await app.db.models.User.create(userProperties)

                        // check if we need to add teams from SSO
                        if (providerOpts.groupMapping) {
                            // This SSO provider is configured to manage team membership.
                            try {
                                await app.sso.updateTeamMembership(samlUser, newUser, providerOpts)
                            } catch (err) {
                                done(err)
                                return
                            }
                        } else {
                            // no SSO Group mapping so create team
                            await completeUserSignup(app, newUser)
                        }
                        request.session.newSSOUser = true
                        done(null, newUser)
                    } catch (err) {
                        // console.log(err)
                        done(err)
                    }
                } else {
                    const unknownError = new Error(`Unknown user: ${samlUser.nameID}`)
                    unknownError.code = 'unknown_sso_user'
                    const userInfo = app.auditLog.formatters.userObject({ email: samlUser.nameID })
                    const resp = { code: 'unknown_sso_user', error: 'unauthorized' }
                    await app.auditLog.User.account.login(userInfo, resp, userInfo)
                    done(unknownError)
                }
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
            const { options } = await app.db.models.SAMLProvider.forEmail(request.user.email)
            const result = await completeSSOSignIn(app, request.user, options.sessionExpiry, options.sessionIdle)
            if (result.cookie) {
                // Valid session
                reply.setCookie('sid', result.cookie.value, result.cookie.options)
                let redirectTo = '/'
                if (request.body?.RelayState) {
                    const state = JSON.parse(request.body.RelayState)
                    redirectTo = /^\/.*/.test(state.redirectTo) ? state.redirectTo : '/'
                }
                if (request.session.newSSOUser) {
                    delete request.session.newSSOUser
                    redirectTo = '/account/settings'
                }
                reply.redirect(redirectTo)
                return
            } else {
                // Invalid session - user is suspended or similar
                reply.redirect('/')
                return
            }
        }
        throw new Error('Invalid SAML response')
    })
}, { name: 'app.ee.routes.sso.auth' })
