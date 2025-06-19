const crypto = require('crypto')

const fp = require('fastify-plugin')
const { OAuth2Client } = require('google-auth-library')

const { generatePassword, completeSSOSignIn, completeUserSignup } = require('../../../../lib/userTeam')

module.exports = fp(async function (app, opts) {
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
        // request.user is the JWT provided by the Google SSO plugin
        // We need to decode and verify it.
        const googleOAuth2Client = new OAuth2Client(clientId)
        try {
            googleOAuth2Client.setCredentials({ access_token: request.query.code })
            const userinfo = await googleOAuth2Client.request({
                url: 'https://www.googleapis.com/oauth2/v3/userinfo'
            })
            const googleUserInfo = userinfo.data
            if (googleUserInfo.hd) {
                // This is a Google Workspace account - check if there is an SSO provider configured for this domain
                const providerId = await app.sso.getProviderForEmail(googleUserInfo.email)
                if (!providerId) {
                    // No SSO provider configured for this domain - redirect to home
                    reply.send({
                        error: 'SSO not available for this Google Workspace domain'
                    })
                } else {
                    // There is an SSO provider configured for this domain - use it
                    reply.send({
                        url: `/ee/sso/login?u=${encodeURIComponent(googleUserInfo.email)}`
                    })
                }
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
            } else {
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

                const baseUsername = googleUserInfo.email.split('@')[0].replaceAll(/\+.*$/g, '').replaceAll(/[^0-9a-zA-Z-]/g, '')
                let username
                // Check if username is available
                let count = 0
                do {
                    username = `${baseUsername}-${crypto.randomBytes(2).toString('hex')}`
                    count = await app.db.models.User.count({
                        where: {
                            username
                        }
                    })
                } while (count > 0)

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
            }
        } catch (err) {
            app.log.error(`Google SSO failed: ${err}`)
            reply.code(500).send({ code: 'invalid_request', error: 'Invalid Request' })
        }
    })
}, { name: 'app.ee.routes.sso.provider.google' })
