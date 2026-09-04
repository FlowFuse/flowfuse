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

// A loopback redirect_uri may vary its port between registration and use
// (RFC 8252 Section 7.3); localhost and 127.0.0.1 are interchangeable.
function isLoopbackHost (hostname) {
    return hostname === 'localhost' || hostname === '127.0.0.1'
}

function redirectUriMatches (registeredURIs, requested) {
    if (registeredURIs.includes(requested)) {
        return true
    }
    let req
    try {
        req = new URL(requested)
    } catch (err) {
        return false
    }
    if (!isLoopbackHost(req.hostname)) {
        return false
    }
    return registeredURIs.some((uri) => {
        let reg
        try {
            reg = new URL(uri)
        } catch (err) {
            return false
        }
        return isLoopbackHost(reg.hostname) && reg.protocol === req.protocol && reg.pathname === req.pathname
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
                required: ['response_type', 'code_challenge', 'code_challenge_method']
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
        let isMCP = false
        if (client_id === 'ff-plugin') {
            // Ensure redirect_uri path component is correct for the tools plugin
            if (!/\/(flow(fuse|forge)-nr-tools|nr-assistant)\/auth\/callback$/.test(redirectURI.pathname)) {
                return badRequest(reply, 'invalid_request', 'Invalid redirect_uri')
            }
            if (scope !== 'ff-plugin' && scope !== 'ff-assistant') {
                return redirectInvalidRequest(reply, redirect_uri, 'invalid_request', "Invalid scope '" + scope + "'", state)
            }
        } else {
            const authClient = await app.db.controllers.AuthClient.getAuthClient(client_id)
            if (!authClient) {
                return badRequest(reply, 'invalid_request', 'Invalid client_id')
            }
            if (authClient.ownerType === 'mcp') {
                // redirect_uri must match one approved at registration; scope is
                // not validated here (chosen by the user on the consent page).
                if (!redirectUriMatches(authClient.redirectURIs, redirect_uri)) {
                    return badRequest(reply, 'invalid_request', 'Invalid redirect_uri')
                }
                isMCP = true
            } else {
                // Dynamic client (project/device editor auth): validate callback path
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
            code_challenge_method,
            mcp: isMCP
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
        if (isMCP) {
            reply.redirect(`${app.config.base_url}/account/request/${requestId}/mcp`)
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
                if (requestObject.client_id === 'ff-plugin' || requestObject.mcp) {
                    // FlowFuse Node-RED plugin or MCP agent: user-scoped, no resource ownership checks
                } else {
                    const authClient = await app.db.controllers.AuthClient.getAuthClient(requestObject.client_id)
                    if (!authClient) {
                        return badRequest(reply, 'invalid_request', 'Invalid client_id')
                    }
                    let owner = null
                    let applicationId
                    if (authClient.ownerType === 'project') {
                        owner = await app.db.models.Project.byId(authClient.ownerId)
                        // Project.byId will include the full Application object
                        applicationId = owner?.Application.hashid
                    } else if (authClient.ownerType === 'device') {
                        owner = await app.db.models.Device.byId(parseInt(authClient.ownerId))
                        // Device.byId does not include the full Application object
                        if (owner?.ApplicationId) {
                            applicationId = app.db.models.Application.encodeHashid(owner.ApplicationId)
                        }
                    }
                    const teamMembership = await request.session.User.getTeamMembership(owner.TeamId)
                    if (!teamMembership && !request.session.User.admin) {
                        // This user is neither a team member, nor an admin - reject
                        return redirectInvalidRequest(reply, requestObject.redirect_uri, 'access_denied', 'Access Denied', requestObject.state)
                    }
                    const isEditor = /^editor($|-)/.test(requestObject.scope)
                    if (isEditor) {
                        // Allow admin users to have read-access to flows
                        const protectedInstance = await owner.getSetting(KEY_PROTECTED)
                        let context
                        if (applicationId) {
                            context = { applicationId }
                        }
                        const canReadFlows = request.session.User.admin || app.hasPermission(teamMembership, 'project:flows:view', context)
                        const canWriteFlows = app.hasPermission(teamMembership, 'project:flows:edit', context) && !protectedInstance?.enabled
                        const canReadHTTP = app.hasPermission(teamMembership, 'project:flows:http', context)
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

    // RFC 7591: Dynamic Client Registration for MCP agents
    app.post('/account/client', {
        config: { allowAnonymous: true },
        schema: {
            tags: ['Authentication', 'X-HIDDEN'],
            body: {
                type: 'object',
                properties: {
                    redirect_uris: { type: 'array', items: { type: 'string' } },
                    client_name: { type: 'string' },
                    grant_types: { type: 'array', items: { type: 'string' } },
                    response_types: { type: 'array', items: { type: 'string' } },
                    token_endpoint_auth_method: { type: 'string' }
                },
                required: ['redirect_uris']
            }
        }
    }, async function (request, reply) {
        const { redirect_uris, client_name, grant_types, response_types } = request.body

        if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
            return badRequest(reply, 'invalid_redirect_uri', 'At least one redirect_uri is required')
        }
        // A redirect_uri must be a loopback http address (local dev tools, RFC 8252
        // Section 7.3) or an https address; anything else is rejected.
        for (const uri of redirect_uris) {
            let parsed
            try {
                parsed = new URL(uri)
            } catch (err) {
                return badRequest(reply, 'invalid_redirect_uri', `Invalid redirect_uri: ${uri}`)
            }
            const loopbackHttp = isLoopbackHost(parsed.hostname) && parsed.protocol === 'http:'
            const secure = parsed.protocol === 'https:'
            if (!loopbackHttp && !secure) {
                return badRequest(reply, 'invalid_redirect_uri', 'redirect_uri must be a loopback http address or an https address')
            }
        }

        const client = await app.db.controllers.AuthClient.createMCPClient({
            name: client_name,
            redirectURIs: redirect_uris
        })

        // MCP clients are public (PKCE, no secret), so no client_secret is issued.
        reply.code(201).send({
            client_id: client.clientID,
            client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
            client_name: client.name,
            redirect_uris,
            grant_types: grant_types || ['authorization_code', 'refresh_token'],
            response_types: response_types || ['code'],
            token_endpoint_auth_method: 'none'
        })
    })

    // MCP consent: save the user's access choices before they approve
    app.put('/account/authorize/:id/consent', {
        preHandler: (request, reply) => app.verifySession(request, reply),
        schema: {
            tags: ['Authentication', 'X-HIDDEN'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
                },
                required: ['id']
            },
            body: {
                type: 'object',
                properties: {
                    readOnly: { type: 'boolean' },
                    teamIds: { type: 'array', items: { type: 'string' } },
                    expiresAt: { type: 'number' }
                }
            }
        }
    }, async function (request, reply) {
        const requestId = request.params.id
        const { readOnly = false, teamIds = [], expiresAt } = request.body

        const session = await app.db.models.OAuthSession.findOne({ where: { id: requestId } })
        if (!session) {
            return badRequest(reply, 'invalid_request', 'Invalid or expired request')
        }
        if (Date.now() - session.createdAt.getTime() >= 1000 * 60 * 5) {
            await session.destroy()
            return badRequest(reply, 'invalid_request', 'Request has expired')
        }
        const requestObject = session.value
        if (!requestObject.mcp) {
            return badRequest(reply, 'invalid_request', 'Invalid request')
        }
        // A grant expiry must be in the future, at most one year out
        const ONE_YEAR = 1000 * 60 * 60 * 24 * 365
        if (expiresAt !== undefined && (expiresAt <= Date.now() || expiresAt > Date.now() + ONE_YEAR)) {
            return badRequest(reply, 'invalid_request', 'Invalid expiresAt')
        }

        session.value = { ...requestObject, readOnly, teamIds, expiresAt }
        await session.save()

        reply.send({ status: 'ok' })
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

            if (client_id === 'ff-plugin') {
                const scope = {
                    'ff-plugin': [
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
                    'ff-assistant': [
                        'user:read',
                        'assistant:call'
                    ]
                }[requestObject.scope]
                if (!scope) {
                    return badRequest(reply, 'access_denied', 'Access Denied')
                }
                const accessToken = await app.db.controllers.AccessToken.createTokenForUser(requestObject.userId,
                    null,
                    scope,
                    true
                )
                const response = {
                    access_token: accessToken.token,
                    expires_in: Math.floor((accessToken.expiresAt - Date.now()) / 1000),
                    refresh_token: accessToken.refreshToken,
                    state: requestObject.state
                }
                reply.send(response)
            } else if (requestObject.mcp) {
                const accessToken = await app.db.controllers.AccessToken.createMCPOAuthToken(
                    requestObject.userId,
                    {
                        readOnly: requestObject.readOnly || false,
                        teamIds: requestObject.teamIds || [],
                        grantExpiresAt: requestObject.expiresAt || null
                    }
                )
                const response = {
                    access_token: accessToken.token,
                    token_type: 'bearer',
                    expires_in: Math.floor((accessToken.expiresAt - Date.now()) / 1000),
                    refresh_token: accessToken.refreshToken,
                    state: requestObject.state
                }
                reply.send(response)
            } else {
                const authClient = await app.db.controllers.AuthClient.getAuthClient(client_id, client_secret)
                if (!authClient) {
                    return badRequest(reply, 'invalid_request', 'Invalid client_id')
                }

                let owner = null
                let applicationId
                if (authClient.ownerType === 'project') {
                    owner = await app.db.models.Project.byId(authClient.ownerId)
                    // Project.byId will include the full Application object
                    applicationId = owner?.Application.hashid
                } else if (authClient.ownerType === 'device') {
                    owner = await app.db.models.Device.byId(parseInt(authClient.ownerId))
                    // Device.byId does not include the full Application object
                    if (owner?.ApplicationId) {
                        applicationId = app.db.models.Application.encodeHashid(owner.ApplicationId)
                    }
                }
                let context
                if (applicationId) {
                    context = { applicationId }
                }
                const teamMembership = await app.db.models.TeamMember.findOne({ where: { TeamId: owner.TeamId, UserId: requestObject.userId } })
                const user = await app.db.models.User.findOne({ where: { id: requestObject.userId }, attributes: ['admin'] })
                const canReadFlows = user.admin || app.hasPermission(teamMembership, 'project:flows:view', context)
                let protectedInstance = null
                if (authClient.ownerType === 'project') {
                    protectedInstance = await owner.getSetting(KEY_PROTECTED)
                }
                const canWriteFlows = app.hasPermission(teamMembership, 'project:flows:edit', context) && !protectedInstance?.enabled
                const canReadHTTP = app.hasPermission(teamMembership, 'project:flows:http', context)
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
            }
        } else if (grant_type === 'refresh_token') {
            const existingToken = await app.db.models.AccessToken.byRefreshToken(refresh_token)
            if (!existingToken) {
                badRequest(reply, 'invalid_request', 'Invalid refresh_token')
                return
            }
            // Only project/device clients re-check resource ownership on refresh;
            // ff-plugin and MCP clients are user-scoped.
            let refreshAuthClient = null
            if (client_id !== 'ff-plugin') {
                refreshAuthClient = await app.db.controllers.AuthClient.getAuthClient(client_id, client_secret)
                if (!refreshAuthClient) {
                    return badRequest(reply, 'invalid_request', 'Invalid client_id')
                }
            }
            if (refreshAuthClient && refreshAuthClient.ownerType !== 'mcp') {
                // Check the owner of the existing session still has access to the project
                // this client is owned by
                let owner = null
                let applicationId
                if (refreshAuthClient.ownerType === 'project') {
                    owner = await app.db.models.Project.byId(refreshAuthClient.ownerId)
                    // Project.byId will include the full Application object
                    applicationId = owner?.Application.hashid
                } else if (refreshAuthClient.ownerType === 'device') {
                    owner = await app.db.models.Device.byId(parseInt(refreshAuthClient.ownerId))
                    // Device.byId does not include the full Application object
                    if (owner?.ApplicationId) {
                        applicationId = app.db.models.Application.encodeHashid(owner.ApplicationId)
                    }
                }
                let context
                if (applicationId) {
                    context = { applicationId }
                }

                const user = await app.db.models.User.findOne({ where: { id: parseInt(existingToken.ownerId) }, attributes: ['admin'] })
                const teamMembership = await app.db.models.TeamMember.findOne({ where: { TeamId: owner.TeamId, UserId: parseInt(existingToken.ownerId) } })
                const canReadFlows = user.admin || app.hasPermission(teamMembership, 'project:flows:view', context)
                const canWriteFlows = app.hasPermission(teamMembership, 'project:flows:edit', context)

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
                token_type: 'bearer',
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
        let sesOwnerId = request.session.ownerId
        // allow lowercase usernames for npm when publishing nodes to Team Library
        if (request.session.ownerType === 'npm' && request.session.scope.includes('team:packages:manage')) {
            sesOwnerId = sesOwnerId.toLowerCase()
        } else if (request.session.ownerType === 'http:device') {
            sesOwnerId = app.db.models.Device.encodeHashid(sesOwnerId)
        }
        if (request.params.ownerType === request.session.ownerType && request.params.ownerId === sesOwnerId) {
            let response
            if (request.headers['ff-quota']) {
                const project = await app.db.models.Project.byId(request.session.ownerId)
                await project.Team.ensureTeamTypeExists()
                const fileStorageLimit = project.Team.getFeatureProperty('fileStorageLimit', 100)
                const contextLimit = project.Team.getFeatureProperty('contextLimit', 1)
                response = {
                    quota: {
                        file: fileStorageLimit * 1024 * 1024,
                        context: contextLimit * 1024 * 1024
                    }
                }
            }
            // Check for npm registry user with publish scope
            if (request.session.ownerType === 'npm') {
                if (!/[pd]-(.+)@(.+)/.test(request.params.ownerId)) {
                    const user = await app.db.models.User.byUsername(request.params.ownerId)
                    const userTeamList = await user.getTeamMemberships(true)
                    const teams = userTeamList.map(t => `${t.Team.hashid}:${t.role}`)
                    response = {
                        teams
                    }
                } else {
                    const team = request.params.ownerId.split('@')[1]
                    response = {
                        teams: [`${team}:0`]
                    }
                }
            }
            reply.code(200).send(response)
        } else {
            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
        }
    })
}
