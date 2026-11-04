const fp = require('fastify-plugin')
const { isFreeEmail } = require('free-email-domains-list')
const { OAuth2Client } = require('google-auth-library')

const USED_GOOGLE_JWT = 'platform-google-sso-tokens'

const { generateUsernameFromEmail, generatePassword, completeSSOSignIn, completeUserSignup } = require('../../../../lib/userTeam')

module.exports = fp(async function (app, opts) {
    app.caches.createCache(USED_GOOGLE_JWT, {
        ttl: (1000 * 60 * 60) // 1hr
    })
    const googleJWTCache = app.caches.getCache(USED_GOOGLE_JWT)

    app.post('/ee/sso/login/callback/google', {
        config: { allowAnonymous: true }
    }, async (request, reply) => {
        const enabled = app.settings.get('platform:sso:google')
        if (!enabled) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }
        if (!request.query.code) {
            reply.code(400).send({ code: 'invalid_request', error: 'Missing code' })
            return
        }
        const clientId = app.settings.get('platform:sso:google:clientId')
        if (!clientId) {
            reply.code(500).send({ code: 'invalid_request', error: 'Google SSO not configured' })
            return
        }
        if (await googleJWTCache.get(request.query.code)) {
            reply.code(403).send({ code: 'not_allowed', error: 'Code already used' })
            return
        }
        // request.user is the JWT provided by the Google SSO plugin
        // We need to decode and verify it.
        const googleOAuth2Client = new OAuth2Client(clientId)
        try {
            const tokenInfo = await googleOAuth2Client.getTokenInfo(request.query.code)
            if (tokenInfo.aud !== clientId) {
                reply.code(400).send({ code: 'invalid_request', error: 'Invalid code' })
                return
            }
            // Now get the user info
            googleOAuth2Client.setCredentials({ access_token: request.query.code })
            const userinfo = await googleOAuth2Client.request({
                url: 'https://www.googleapis.com/oauth2/v3/userinfo'
            })
            const googleUserInfo = userinfo.data
            await googleJWTCache.set(request.query.code, {})
            if (googleUserInfo.email_verified !== true) {
                reply.code(403).send({ code: 'unverified_email', error: 'Google account email is not verified' })
                return
            }
            // Any email on a domain with an SSO provider must go through that provider,
            // whether or not Google reports a Workspace (hd) account
            const provider = await app.db.models.SAMLProvider.forEmail(googleUserInfo.email)
            if (provider) {
                if (provider.type === 'saml') {
                    reply.send({
                        url: `/ee/sso/login?u=${encodeURIComponent(googleUserInfo.email)}`
                    })
                } else {
                    // LDAP sign in needs a username and password, so it cannot be started from Google
                    reply.code(403).send({ code: 'ldap_sso', error: 'LDAP enabled for this domain' })
                }
                return
            }
            if (googleUserInfo.hd) {
                // Workspace account on a domain with no SSO provider configured
                reply.send({
                    error: 'SSO not available for this Google Workspace domain'
                })
                return
            }
            const user = await app.db.models.User.byUsernameOrEmail(googleUserInfo.email)
            if (user) {
                const result = await completeSSOSignIn(app, user)
                if (result.cookie) {
                    reply.setCookie('sid', result.cookie.value, result.cookie.options)
                }
                reply.send({
                    url: '/'
                })
            } else if (app.settings.get('platform:sso:google:auto-create') === true) {
                if (app.billing && isFreeEmail(googleUserInfo.email.toLowerCase())) {
                    const invite = await app.db.models.Invitation.forExternalEmail(googleUserInfo.email)
                    if (!invite || invite.length === 0) {
                        reply.code(400).send({ code: 'invalid_email_domain', error: 'Please register using your company email address' })
                        return
                    }
                }
                // Create a new user for this email address
                const userProperties = {
                    name: googleUserInfo.name || googleUserInfo.email.split('@')[0],
                    email: googleUserInfo.email,
                    // Verified email from Google
                    email_verified: true,
                    // Generate a random password
                    password: generatePassword(),
                    // Explicitly don't create an admin user
                    admin: false,
                    sso_enabled: true
                }
                // Need to determine the username

                const username = await generateUsernameFromEmail(app, googleUserInfo.email)
                userProperties.username = username
                try {
                    // - Create user in DB
                    const newUser = await app.db.models.User.create(userProperties)
                    // - Common sign-up completion - accepts invites etc if needed
                    await completeUserSignup(app, newUser)
                    // - Common sign-in completion - sets up session
                    const result = await completeSSOSignIn(app, newUser)
                    if (result.cookie) {
                        reply.setCookie('sid', result.cookie.value, result.cookie.options)
                    }
                    reply.send({
                        url: '/'
                    })
                    return
                } catch (err) {
                    app.log.error(`Failed to create user via Google SSO: ${err}`)
                    reply.send({
                        error: `Failed to create user via Google SSO: ${err}`
                    })
                }
                reply.send({
                    url: '/'
                })
            } else {
                reply.send({
                    url: '/'
                })
            }
        } catch (err) {
            app.log.error(`Google SSO failed: ${err}`)
            reply.code(500).send({ code: 'invalid_request', error: 'Invalid Request' })
        }
    })
}, { name: 'app.ee.routes.sso.provider.google' })
