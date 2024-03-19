const crypto = require('crypto')
const querystring = require('querystring')
const { URL } = require('url')

const { KEY_PROTECTED } = require('../../db/models/ProjectSettings')

const { base64URLEncode, sha256, URLEncode } = require('../../db/utils')

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

module.exports = async function (app) {
    const requestCache = {
        set: async function (id, value) {
            return app.db.models.OAuthSession.create({ id, value })
        },
        get: async function (id) {
            return app.db.models.OAuthSession.getAndRemoveById(id)
        }
    }

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
        config: {
            rateLimit: false // never rate limit this route
        },
        schema: {
            tags: ['Authentication', 'X-HIDDEN'],
            querystring: {
                type: 'object',
                properties: {
                    response_type: { type: 'string' },
                    scope: { type: 'string' },
                    code_challenge: { type: 'string' },
                    code_challenge_method: { type: 'string' }
                },
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
        if (!redirect_uri) {
            return badRequest(reply, 'invalid_request', 'Invalid redirect_uri')
        }
        let redirectURI
        try {
            redirectURI = new URL(redirect_uri)
        } catch (err) {
            return badRequest(reply, 'invalid_request', 'Invalid redirect_uri')
        }
        if (client_id !== 'ff-plugin') {
            // Check client_id is valid. Note - no client_secret provided at this point
            const authClient = await app.db.controllers.AuthClient.getAuthClient(client_id)
            if (!authClient) {
                return badRequest(reply, 'invalid_request', 'Invalid client_id')
            }
            // Ensure redirect_uri path component is correct
            if (
                // HTTP Auth callback
                !/\/_ffAuth\/callback$/.test(redirectURI.pathname) &&
                // Admin Auth callback
                !/\/auth\/strategy\/callback$/.test(redirectURI.pathname)
            ) {
                return badRequest(reply, 'invalid_request', 'Invalid redirect_uri')
            }
            if (!/^(editor($|-))|httpAuth-/.test(scope)) {
                return redirectInvalidRequest(reply, redirect_uri, 'invalid_request', "Invalid scope '" + scope + "'. Only 'editor[-version]' is supported", state)
            }
        } else {
            // Ensure redirect_uri path component is correct for the tools plugin
            if (!/\/flow(fuse|forge)-nr-tools\/auth\/callback$/.test(redirectURI.pathname)) {
                return badRequest(reply, 'invalid_request', 'Invalid redirect_uri')
            }
            if (scope !== 'ff-plugin') {
                return redirectInvalidRequest(reply, redirect_uri, 'invalid_request', "Invalid scope '" + scope + "'. Only 'ff-plugin' is supported", state)
            }
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
        await requestCache.set(requestId, requestObject)

        const isNodeRED = /^(editor($|-))|httpAuth-/.test(scope)
        if (isNodeRED) {
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

    app.get('/account/complete/:code', {
        schema: {
            tags: ['Authentication', 'X-HIDDEN']
        }
    }, async function (request, reply) {
        const requestId = request.params.code
        const requestObject = await requestCache.get(requestId)
        if (!requestObject) {
            return badRequest(reply, 'invalid_request', 'Invalid request')
        }
        if (request.sid) {
            request.session = await app.db.controllers.Session.getOrExpire(request.sid)
            if (request.session) {
                if (requestObject.client_id === 'ff-plugin') {
                    // This is the FlowFuse Node-RED plugin.
                } else {
                    const authClient = await app.db.controllers.AuthClient.getAuthClient(requestObject.client_id)
                    if (!authClient) {
                        return badRequest(reply, 'invalid_request', 'Invalid client_id')
                    }
                    const project = await app.db.models.Project.byId(authClient.ownerId)
                    const teamMembership = await request.session.User.getTeamMembership(project.TeamId)
                    if (!teamMembership && !request.session.User.admin) {
                        // This user is neither a team member, nor an admin - reject
                        return redirectInvalidRequest(reply, requestObject.redirect_uri, 'access_denied', 'Access Denied', requestObject.state)
                    }
                    const isEditor = /^editor($|-)/.test(requestObject.scope)
                    if (isEditor) {
                        // Allow admin users to have read-access to flows
                        const protectedInstance = await project.getSetting(KEY_PROTECTED)
                        const canReadFlows = request.session.User.admin || app.hasPermission(teamMembership, 'project:flows:view')
                        const canWriteFlows = app.hasPermission(teamMembership, 'project:flows:edit') && !protectedInstance?.enabled
                        const canReadHTTP = app.hasPermission(teamMembership, 'project:flows:http')
                        if (!canReadFlows && !canWriteFlows) {
                            if (!canReadHTTP) {
                                return redirectInvalidRequest(reply, requestObject.redirect_uri, 'access_denied', 'Access Denied', requestObject.state)
                            } else {
                                // We have to avoid Node-RED autoLogin redirect loops - so bail out with this
                                // rather ugly error message.
                                reply.code(400).send('Access Denied: you do not have access to the editor')
                                return
                            }
                        }
                        if (!canWriteFlows && requestObject.scope === 'editor') {
                            // Older versions of nr-auth do not know how to apply read-only
                            // access. We know it is an older version because it set scope to `editor`.
                            // Versions that support viewer will have a scope of `editor-<version>`.
                            // This should be sent as plain text as the user will see it in the browser window.
                            reply.code(400).send('Please ask the team owner to update this project to the latest stack to support viewer access')
                            return
                        }
                    } else {
                        // This is the httpNode middleware checking access. All
                        // team members are allowed to access the httpNode routes
                        if (!teamMembership) {
                            // This is an admin who isn't a team member - reject the request
                            return redirectInvalidRequest(reply, requestObject.redirect_uri, 'access_denied', 'Access Denied', requestObject.state)
                        }
                    }
                }
                requestObject.userId = request.session.User.id
                requestObject.code = base64URLEncode(crypto.randomBytes(32))
                await requestCache.set(requestObject.code, requestObject)
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
    app.get('/account/reject/:code', {
        schema: {
            tags: ['Authentication', 'X-HIDDEN']
        }
    }, async function (request, reply) {
        const requestId = request.params.code
        const requestObject = await requestCache.get(requestId)
        if (!requestObject) {
            return badRequest(reply, 'invalid_request', 'Invalid request')
        }
        return redirectInvalidRequest(reply, requestObject.redirect_uri, 'access_denied', 'Access Denied', requestObject.state)
    })

    app.post('/account/token', {
        config: {
            rateLimit: false // never rate limit this route
        },
        schema: {
            tags: ['Authentication', 'X-HIDDEN'],
            body: {
                type: 'object',
                properties: {
                    grant_type: { type: 'string' },
                    code: { type: 'string' },
                    code_verifier: { type: 'string' },
                    client_id: { type: 'string' },
                    client_secret: { type: 'string' },
                    redirect_uri: { type: 'string' },
                    refresh_token: { type: 'string' }
                },
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
            const requestObject = await requestCache.get(code)

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
            if (requestObject.code_challenge !== URLEncode(sha256(code_verifier))) {
                redirectInvalidRequest(reply, 'invalid_request', 'Invalid code_verifier', requestObject.state)
                return
            }

            if (client_id !== 'ff-plugin') {
                const authClient = await app.db.controllers.AuthClient.getAuthClient(client_id, client_secret)
                if (!authClient) {
                    return badRequest(reply, 'invalid_request', 'Invalid client_id')
                }

                const project = await app.db.models.Project.byId(authClient.ownerId)
                const teamMembership = await app.db.models.TeamMember.findOne({ where: { TeamId: project.TeamId, UserId: requestObject.userId } })
                const user = await app.db.models.User.findOne({ where: { id: requestObject.userId }, attributes: ['admin'] })
                const canReadFlows = user.admin || app.hasPermission(teamMembership, 'project:flows:view')
                const protectedInstance = await project.getSetting(KEY_PROTECTED)
                const canWriteFlows = app.hasPermission(teamMembership, 'project:flows:edit') && !protectedInstance?.enabled
                const canReadHTTP = app.hasPermission(teamMembership, 'project:flows:http')
                const isEditor = /^editor($|-)/.test(requestObject.scope)

                if (isEditor && !canReadFlows && !canWriteFlows) {
                    return badRequest(reply, 'access_denied', 'Access Denied')
                }
                if (!isEditor && !canReadHTTP) {
                    return badRequest(reply, 'access_denied', 'Access Denied')
                }
                const accessToken = await app.db.controllers.AccessToken.createTokenForUser(requestObject.userId,
                    null,
                    isEditor
                        ? ['user:read', 'project:flows:view', 'project:flows:edit', 'project:flows:http']
                        : ['user:read', 'project:flows:http'],
                    true
                )

                let scope = '*'
                if (!canWriteFlows && canReadFlows) {
                    scope = 'read'
                } else if (!canWriteFlows && !canReadFlows && canReadHTTP) {
                    scope = 'http'
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
                        'user:team:list',
                        'team:read',
                        'team:projects:list',
                        'project:read',
                        'project:snapshot:list',
                        'project:snapshot:create',
                        'device:snapshot:list',
                        'device:snapshot:create'
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
                const user = await app.db.models.User.findOne({ where: { id: parseInt(existingToken.ownerId) }, attributes: ['admin'] })
                const teamMembership = await app.db.models.TeamMember.findOne({ where: { TeamId: project.TeamId, UserId: parseInt(existingToken.ownerId) } })
                const canReadFlows = user.admin || app.hasPermission(teamMembership, 'project:flows:view')
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
        preHandler: (request, reply) => app.verifySession(request, reply),
        schema: {
            tags: ['Authentication', 'X-HIDDEN']
        }
    }, async (request, reply) => {
        if (request.params.ownerType === request.session.ownerType && request.params.ownerId === request.session.ownerId) {
            let response
            if (request.headers['ff-quota']) {
                const project = await app.db.models.Project.byId(request.session.ownerId)
                const teamType = await project.Team.getTeamType()
                const fileStorageLimit = teamType.getFeatureProperty('fileStorageLimit', 100)
                const contextLimit = teamType.getFeatureProperty('contextLimit', 1)
                response = {
                    quota: {
                        file: fileStorageLimit * 1024 * 1024,
                        context: contextLimit * 1024 * 1024
                    }
                }
            }
            reply.code(200).send(response)
        } else {
            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
        }
    })
}
