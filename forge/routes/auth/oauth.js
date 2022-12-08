const { URL } = require('url')
const querystring = require('querystring')

const LRU = require('lru-cache') // https://www.npmjs.com/package/lru-cache
const crypto = require('crypto')

const requestCache = new LRU({
    ttl: 1000 * 60 * 10, // 10 minutes,
    max: 100
})

function badRequest (reply, error, description) {
    // This format is defined by the OAuth standard - do not change
    reply.code(400).send({
        error,
        description
    })
}

function redirectInvalidRequest (reply, redirectURI, error, errorDescription, state) {
    const responseUrl = new URL(redirectURI)
    const response = { error, errorDescription }
    if (state) {
        response.state = state
    }
    responseUrl.search = querystring.stringify(response)
    reply.redirect(responseUrl.toString())
}

function base64URLEncode (str) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
}
function sha256 (buffer) {
    return crypto.createHash('sha256').update(buffer).digest()
}

module.exports = async function (app) {
    app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, function (req, body, done) {
        try {
            const json = querystring.parse(body)
            done(null, json)
        } catch (err) {
            err.statusCode = 400
            done(err, undefined)
        }
    })

    app.get('/account/authorize', {
        schema: {
            querystring: {
                type: 'object',
                // client_id and redirect_uri are handled manually
                required: ['response_type', 'scope', 'code_challenge', 'code_challenge_method']
            }
        },
        attachValidation: true
    }, async function (request, reply) {
        /* eslint-disable camelcase */
        const {
            response_type,
            client_id,
            scope,
            redirect_uri,
            state,
            code_challenge,
            code_challenge_method
        } = request.query

        // If client_id/redirect_uri missing/invalid - reject directly with bad request
        if (!client_id) {
            return badRequest(reply, 'invalid_request', 'Invalid client_id')
        }
        if (client_id !== 'ff-plugin') {
            // Check client_id is valid. Note - no client_secret provided at this point
            const authClient = await app.db.controllers.AuthClient.getAuthClient(client_id)
            if (!authClient) {
                return badRequest(reply, 'invalid_request', 'Invalid client_id')
            }
            if (!/^editor($|-)/.test(scope)) {
                return redirectInvalidRequest(reply, redirect_uri, 'invalid_request', "Invalid scope '" + scope + "'. Only 'editor[-version]' is supported", state)
            }
        } else {
            if (scope !== 'ff-plugin') {
                return redirectInvalidRequest(reply, redirect_uri, 'invalid_request', "Invalid scope '" + scope + "'. Only 'ff-plugin' is supported", state)
            }
        }

        if (!redirect_uri) {
            return badRequest(reply, 'invalid_request', 'Invalid redirect_uri')
        }
        // If anything else missing, redirect with details
        if (request.validationError) {
            redirectInvalidRequest(reply, redirect_uri, 'invalid_request', request.validationError.message, state)
            return
        }

        // http://localhost:3000/account/authorize?client_id=foo&redirect_uri=http://localhost:3000/account/bounce&scope=openid%20profile&response_type=code&state=ABC&code_challenge=yV39yiCZm7LlI_VgcTJTRICWJGcc3a_l1KSdlyX2uME&code_challenge_method=S256

        if (response_type !== 'code') {
            return redirectInvalidRequest(reply, redirect_uri, 'unsupported_response_type', "Invalid response_type. Only 'code' is supported", state)
        }
        if (code_challenge_method !== 'S256') {
            return redirectInvalidRequest(reply, redirect_uri, 'invalid_request', "Invalid code_challenge_method. Only 'S256' is supported", state)
        }

        const requestObject = {
            response_type,
            client_id,
            scope,
            redirect_uri,
            state,
            code_challenge,
            code_challenge_method
        }
        const requestId = base64URLEncode(crypto.randomBytes(32))
        requestCache.set(requestId, requestObject)

        const isEditor = /^editor($|-)/.test(scope)
        if (isEditor) {
            if (request.sid) {
                // This is the editor auth flow. If logged-in, redirect straight
                // to the complete route. Otherwise prompt to login
                request.session = await app.db.controllers.Session.getOrExpire(request.sid)
                if (request.session) {
                    // Logged in with valid session - bounce to complete page
                    reply.redirect(`${app.config.base_url}/account/complete/${requestId}`)
                    return
                }
            }
            // Redirect to login page with requestId in url - add /editor to bypass the
            // approval page
            reply.redirect(`${app.config.base_url}/account/request/${requestId}/editor`)
            return
        }
        // Redirect to login page with requestId in url - to bounce to an approve page
        reply.redirect(`${app.config.base_url}/account/request/${requestId}`)
    })

    app.get('/account/complete/:code', async function (request, reply) {
        const requestId = request.params.code
        const requestObject = requestCache.get(requestId)
        requestCache.delete(requestId)

        if (!requestObject) {
            return badRequest(reply, 'invalid_request', 'Invalid request')
        }

        if (request.sid) {
            request.session = await app.db.controllers.Session.getOrExpire(request.sid)
            if (request.session) {
                if (requestObject.client_id === 'ff-plugin') {
                    // This is the FlowForge Node-RED plugin.
                } else {
                    const authClient = await app.db.controllers.AuthClient.getAuthClient(requestObject.client_id)
                    if (!authClient) {
                        return badRequest(reply, 'invalid_request', 'Invalid client_id')
                    }
                    const project = await app.db.models.Project.byId(authClient.ownerId)
                    const teamMembership = await request.session.User.getTeamMembership(project.TeamId)
                    if (!teamMembership) {
                        return redirectInvalidRequest(reply, requestObject.redirect_uri, 'access_denied', 'Access Denied', requestObject.state)
                    }
                    const canReadFlows = app.hasPermission(teamMembership, 'project:flows:view')
                    const canWriteFlows = app.hasPermission(teamMembership, 'project:flows:edit')
                    if (!canReadFlows && !canWriteFlows) {
                        return redirectInvalidRequest(reply, requestObject.redirect_uri, 'access_denied', 'Access Denied', requestObject.state)
                    }
                    if (!canWriteFlows && requestObject.scope === 'editor') {
                        // Older versions of nr-auth do not know how to apply read-only
                        // access. We know it is an older version because it set scope to `editor`.
                        // Versions that support viewer will have a scope of `editor-<version>`.
                        // This should be sent as plain text as the user will see it in the browser window.
                        reply.code(400).send('Please ask the team owner to update this project to the latest stack to support viewer access')
                        return
                    }
                }
                requestObject.userId = request.session.User.id
                requestObject.code = base64URLEncode(crypto.randomBytes(32))
                requestCache.set(requestObject.code, requestObject)
                const responseUrl = new URL(requestObject.redirect_uri)

                responseUrl.search = querystring.stringify({
                    code: requestObject.code,
                    state: requestObject.state
                })
                reply.redirect(responseUrl.toString())
                return
            }
        }
        return badRequest(reply, 'access_denied', 'Access Denied')
    })
    app.get('/account/reject/:code', async function (request, reply) {
        const requestId = request.params.code
        const requestObject = requestCache.get(requestId)
        requestCache.delete(requestId)
        if (!requestObject) {
            return badRequest(reply, 'invalid_request', 'Invalid request')
        }
        return redirectInvalidRequest(reply, requestObject.redirect_uri, 'access_denied', 'Access Denied', requestObject.state)
    })

    app.post('/account/token', {
        schema: {
            body: {
                type: 'object',
                // client_id, redirect_uri, code, code_verifier are handled manually
                required: ['grant_type']
            }
        },
        attachValidation: true
    },
    async function (request, reply) {
        const {
            grant_type,
            code,
            code_verifier,
            client_id,
            client_secret,
            redirect_uri,
            refresh_token
        } = request.body

        if (request.validationError) {
            badRequest(reply, 'invalid_request', request.validationError.message)
            return
        }
        if (!client_id) {
            return badRequest(reply, 'invalid_request', 'Invalid client_id')
        }

        if (grant_type === 'authorization_code') {
            if (!code) {
                return badRequest(reply, 'invalid_request', 'Invalid code')
            }
            if (!redirect_uri) {
                return badRequest(reply, 'invalid_request', 'Invalid redirect_uri')
            }
            if (!code_verifier) {
                return badRequest(reply, 'invalid_request', 'Invalid code_verifier')
            }
            const requestObject = requestCache.get(code)
            requestCache.delete(code)

            if (!requestObject) {
                badRequest(reply, 'invalid_request', 'Invalid code')
                return
            }
            if (!requestObject.userId) {
                badRequest(reply, 'access_denied', 'Access Denied - missing user', requestObject.state)
                return
            }
            if (requestObject.client_id !== client_id) {
                badRequest(reply, 'invalid_request', 'Invalid client_id', requestObject.state)
                return
            }
            if (requestObject.redirect_uri !== redirect_uri) {
                badRequest(reply, 'invalid_request', 'Invalid redirect_uri', requestObject.state)
                return
            }
            if (requestObject.code_challenge !== base64URLEncode(sha256(code_verifier))) {
                redirectInvalidRequest(reply, 'invalid_request', 'Invalid code_verifier', requestObject.state)
                return
            }

            if (client_id !== 'ff-plugin') {
                const authClient = await app.db.controllers.AuthClient.getAuthClient(client_id, client_secret)
                if (!authClient) {
                    return badRequest(reply, 'invalid_request', 'Invalid client_id')
                }

                const accessToken = await app.db.controllers.AccessToken.createTokenForUser(requestObject.userId,
                    null,
                    ['user:read', 'project:flows:view', 'project:flows:edit'],
                    true
                )

                const project = await app.db.models.Project.byId(authClient.ownerId)
                const teamMembership = await app.db.models.TeamMember.findOne({ where: { TeamId: project.TeamId, UserId: requestObject.userId } })
                const canReadFlows = app.hasPermission(teamMembership, 'project:flows:view')
                const canWriteFlows = app.hasPermission(teamMembership, 'project:flows:edit')

                if (!canReadFlows && !canWriteFlows) {
                    app.db.controllers.AccessToken.destroyToken(accessToken.token)
                    return badRequest(reply, 'access_denied', 'Access Denied')
                }

                let scope = '*'
                if (!canWriteFlows) {
                    scope = 'read'
                }
                const response = {
                    access_token: accessToken.token,
                    expires_in: Math.floor((accessToken.expiresAt - Date.now()) / 1000),
                    refresh_token: accessToken.refreshToken,
                    state: requestObject.state,
                    scope
                }
                reply.send(response)
            } else {
                const accessToken = await app.db.controllers.AccessToken.createTokenForUser(requestObject.userId,
                    null,
                    [
                        'user:read',
                        'team:read',
                        'team:projects:list',
                        'project:read',
                        'project:snapshot:list',
                        'project:snapshot:create'
                    ],
                    true
                )
                const response = {
                    access_token: accessToken.token,
                    expires_in: Math.floor((accessToken.expiresAt - Date.now()) / 1000),
                    refresh_token: accessToken.refreshToken,
                    state: requestObject.state
                }
                reply.send(response)
            }
        } else if (grant_type === 'refresh_token') {
            const existingToken = await app.db.models.AccessToken.byRefreshToken(refresh_token)
            if (!existingToken) {
                badRequest(reply, 'invalid_request', 'Invalid refresh_token')
                return
            }
            if (client_id !== 'ff-plugin') {
                const authClient = await app.db.controllers.AuthClient.getAuthClient(client_id, client_secret)
                if (!authClient) {
                    return badRequest(reply, 'invalid_request', 'Invalid client_id')
                }
                // We have validated client_id and client_secret by this point.

                // Check the owner of the existing session still has access to the project
                // this client is owned by
                const project = await app.db.models.Project.byId(authClient.ownerId)
                const teamMembership = await app.db.models.TeamMember.findOne({ where: { TeamId: project.TeamId, UserId: parseInt(existingToken.ownerId) } })
                const canReadFlows = app.hasPermission(teamMembership, 'project:flows:view')
                const canWriteFlows = app.hasPermission(teamMembership, 'project:flows:edit')

                if (!canReadFlows && !canWriteFlows) {
                    return badRequest(reply, 'access_denied', 'Access Denied')
                }
            }
            const accessToken = await app.db.controllers.AccessToken.refreshToken(refresh_token)
            if (!accessToken) {
                badRequest(reply, 'invalid_request', 'Invalid refresh_token')
                return
            }

            const response = {
                access_token: accessToken.token,
                expires_in: Math.floor((accessToken.expiresAt - Date.now()) / 1000),
                refresh_token: accessToken.refreshToken
            }
            reply.send(response)
        } else {
            badRequest(reply, 'invalid_request', "Invalid grant_type. Only 'authorization_code' and 'refresh_token' are supported")
        }
    })

    app.get('/account/check/:ownerType/:ownerId', {
        // Add an explicit function here as `app.verifySession` will not have been
        // mounted at the point this route is being registered
        preHandler: (request, reply) => app.verifySession(request, reply)
    }, async (request, reply) => {
        if (request.params.ownerType === request.session.ownerType && request.params.ownerId === request.session.ownerId) {
            reply.code(200).send()
        } else {
            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
        }
    })
}
