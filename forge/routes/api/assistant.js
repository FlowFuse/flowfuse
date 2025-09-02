const { default: axios } = require('axios')
const { LRUCache } = require('lru-cache')

/**
 * Assistant api routes
 *
 * - /api/v1/assistant
 *
 * @namespace assistant
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    const assetCache = new LRUCache({
        max: app.config.assistant?.assetCache?.max || 100,
        ttl: app.config.assistant?.assetCache?.ttl || 30 * 60 * 1000, // Defaults to 1/2 hour cache for assets - enough to handle bursts
        updateAgeOnGet: false // do not update the age on get, we want it to expire after the original ttl
    })
    const tablesSchemaCache = new LRUCache({
        max: app.config.assistant?.tablesSchemaCache?.max || 100,
        ttl: app.config.assistant?.tablesSchemaCache?.ttl || 5 * 60 * 1000, // Defaults to 5 mins
        updateAgeOnGet: false // do not update the age on get, we want it to expire after the original ttl
    })

    // decorate the app with the asset cache
    app.decorate('assistant', { assetCache, tablesSchemaCache })

    // Get the assistant service configuration
    const serviceUrl = app.config.assistant?.service?.url
    const serviceToken = app.config.assistant?.service?.token
    const serviceEnabled = app.config.assistant?.enabled !== false && serviceUrl
    const requestTimeout = app.config.assistant?.service?.requestTimeout || 60000

    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, reply) => {
        if (!serviceEnabled) {
            return reply.code(501).send({ code: 'service_disabled', error: 'Assistant service is not enabled' })
        }
        // Only permit requests made by a valid device or instance token
        if (!request.session || request.session.provisioning) {
            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
        } else if (request.session.ownerType !== 'device' && request.session.ownerType !== 'project') {
            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
        } else {
            // get the owner object and team
            if (request.session.ownerType === 'device') {
                request.owner = await app.db.models.Device.byId(+request.session.ownerId)
                request.ownerType = 'device'
                request.ownerId = request.owner.hashid
            } else {
                request.owner = await app.db.models.Project.byId(request.session.ownerId)
                request.ownerType = 'project'
                request.ownerId = request.owner.id
            }
            request.team = await app.db.models.Team.byId(request.owner.Team.id)
        }
    })

    /**
     * Endpoint to serve static assets
     * This is used to serve static assets required by the assistant plugin
     * namely, the models and vocabulary files (typically < 1MB in total).
     * Assets are cached in memory to reduce load during bursts.
     * The assets are fetched from the assistant service and cached for 30 minutes.
     */
    app.get('/assets/*', {
        schema: {
            hide: true // dont show in swagger
        }
    }, async (request, reply) => {
        const upstreamPath = request.params['*'] // the path to the asset
        if (!upstreamPath) {
            return reply.code(400).send({ code: 'invalid_path', error: 'Invalid asset path' })
        } else if (upstreamPath.startsWith('/')) {
            return reply.code(400).send({ code: 'invalid_path', error: 'Asset paths must not start with a slash' })
        }
        const targetUrl = new URL(`assets/${upstreamPath}`, serviceUrl).toString() // construct the full URL to the asset
        const cacheKey = upstreamPath
        const cachedAsset = assetCache.get(cacheKey)
        // check if the asset is cached
        if (cachedAsset) {
            // FUTURE: add an etag to the cached asset and if the client has an If-None-Match header, check if it matches the cached asset's ETag
            // If it does, return a 304 Not Modified response
            // For now, the requester (ff-assistant) does not store the file or ETag so there is no point at this time.
            // However, if we have a WAF or similar in front of this service, it may add an ETag header to the response
            // and we can use that to send a 304 Not Modified response
            reply.code(cachedAsset.statusCode)
            const responseHeaders = buildAssetResponseHeaders(cachedAsset)
            for (const headerName in responseHeaders) {
                reply.header(headerName, responseHeaders[headerName])
            }
            return reply.send(cachedAsset.body)
        }

        // Make a get request for asset to the assistant service
        try {
            const headers = await buildRequestHeaders(request)
            const response = await axios.get(targetUrl, {
                headers,
                responseType: 'arraybuffer', // Always get response as a buffer to handle both binary and text/json
                timeout: requestTimeout,
                validateStatus: (status) => true // Accept all status codes, we will handle them manually
            })
            const responseBody = Buffer.from(response.data)

            // Store the response in cache, including status, headers, and body
            const assetToCache = {
                statusCode: response.status, // Axios uses 'status' for status code
                headers: {
                    ...response.headers
                },
                body: responseBody // This will be a Node.js Buffer
            }
            // cache the asset
            assetCache.set(upstreamPath, assetToCache)
            const responseHeaders = buildAssetResponseHeaders(response)
            for (const headerName in responseHeaders) {
                reply.header(headerName, responseHeaders[headerName])
            }
            reply.send(response.data)
        } catch (error) {
            if (!reply.sent) {
                reply.code(error.response?.status || 500).send({ code: error.response?.data?.code || 'unexpected_error', error: error.response?.data?.error || error.message })
            }
        }
    })
    /**
     * Endpoint for FIM (fill-in-the-middle) code completion requests
     * For now, this is simply a relay to an external assistant service
     * In the future, we may decide to bring that service inside the core or
     * use an alternative means of accessing it.
     * @name /api/v1/assistant/fim/:nodeModule/:nodeType
     * @static
     * @memberof forge.routes.api.assistant
     */
    app.post('/fim/:nodeModule/:nodeType', {
        config: {
            rateLimit: app.config.rate_limits
                ? {
                    hook: 'preHandler', // apply the rate as a preHandler so that session is available
                    max: 60, // max requests per window. Since the assistant plugin debounces requests, this should minimise risk of overuse without impacting user experience
                    timeWindow: 30000, // 30 seconds window
                    keyGenerator: (request) => {
                        return request.ownerId || request.ip
                    }
                }
                : false
        },
        schema: {
            hide: true, // dont show in swagger
            params: {
                nodeModule: { type: 'string' },
                nodeType: { type: 'string' }
            },
            body: {
                type: 'object',
                properties: {
                    // The prompt to send to the assistant (required)
                    prompt: { type: 'string' },
                    // A correlation id for the transaction (required)
                    transactionId: { type: 'string' },
                    // Additional context for the completion (optional)
                    context: { type: 'object', additionalProperties: true }
                },
                required: ['prompt', 'transactionId']
            },
            response: {
                200: {
                    type: 'object',
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    },
    async (request, reply) => {
        // Check license and tier - FIM is only available for certain tiers
        const isLicensed = app.license?.active() || false
        const licenseType = isLicensed ? (app.license.get('dev') ? 'DEV' : 'EE') : 'CE'
        const tier = isLicensed ? app.license.get('tier') : null
        const fimTiers = [
            'starter',
            'teams', // AKA "pro" tier
            'enterprise'
        ]
        const minTier = app.config.assistant?.completions?.inlineMinTier || 'teams'
        const inlineDisabled = app.config.assistant?.completions?.inlineEnabled === false
        const enabled = !inlineDisabled && (fimTiers.indexOf(tier) >= fimTiers.indexOf(minTier) || licenseType === 'DEV')

        if (!enabled) {
            return reply.code(403).send({ code: 'forbidden', error: 'Forbidden' })
        }

        const nodeModule = request.params.nodeModule
        const nodeType = request.params.nodeType
        const supported = [
            { nodeModule: 'node-red', nodeName: 'function' },
            { nodeModule: '@flowfuse/node-red-dashboard', nodeName: 'ui-template' },
            { nodeModule: '@flowfuse/nr-tables-nodes', nodeName: 'tables-query' }
        ]
        if (supported.findIndex(item => item.nodeModule === nodeModule && item.nodeName === nodeType) === -1) {
            // unsupported node
            return reply.code(400).send({ code: 'not_supported', error: 'Not Supported' })
        }

        // if this is a `flowfuse-tables-query` lets see if tables are enabled and try to get the schema hints
        let tablesCacheKey = null
        if (nodeModule === '@flowfuse/nr-tables-nodes' && nodeType === 'tables-query') {
            const tablesFeatureEnabled = app.config.features.enabled('tables') && request.team.TeamType.getFeatureProperty('tables', false)
            tablesCacheKey = tablesFeatureEnabled && request.team.hashid + '/tables/schema'
            if (tablesCacheKey) {
                if (!tablesSchemaCache.has(tablesCacheKey)) {
                    const { getTablesHints } = require('../../lib/assistant.js')
                    const creds = await app.tables.getDatabases(request.team)
                    if (creds && creds.length) {
                        const database = creds[0] // Get the first database
                        try {
                            // Get the DDL
                            const schemaData = await getTablesHints(app, request.team, database.hashid)
                            tablesSchemaCache.set(tablesCacheKey, schemaData)
                        } catch (error) {
                            tablesSchemaCache.set(tablesCacheKey, '')
                        }
                    }
                }
            }
        }

        // post to the assistant service /fim/:nodeModule/:nodeType endpoint
        try {
            let isTeamOnTrial
            if (app.billing && request.team.getSubscription) {
                const subscription = await request.team.getSubscription()
                isTeamOnTrial = subscription ? subscription.isTrial() : null
            }
            const data = { ...request.body }
            if (tablesCacheKey) {
                data.context = data.context || {}
                data.context.tablesSchema = tablesSchemaCache.get(tablesCacheKey)
            }

            const method = `fim/${encodeURIComponent(nodeModule)}/${encodeURIComponent(nodeType)}`
            const response = await app.db.controllers.Assistant.invokeLLM(method, data, {
                teamHashId: request.team.hashid,
                instanceType: request.ownerType,
                instanceId: request.ownerId,
                additionalHeaders: request.headers,
                isTeamOnTrial
            })

            reply.send(response.data)
        } catch (error) {
            reply.code(error.response?.status || 500).send({ code: error.response?.data?.code || 'unexpected_error', error: error.response?.data?.error || error.message })
        }
    })
    /**
     * Endpoint for assistant methods
     * For now, this is simply a relay to an external assistant service
     * In the future, we may decide to bring that service inside the core or
     * use an alternative means of accessing it.
    */
    app.post('/:method', {
        config: {
            rateLimit: app.config.rate_limits
                ? {
                    hook: 'preHandler', // apply the rate as a preHandler so that session is available
                    max: 5, // max requests per window
                    timeWindow: 30000, // 30 seconds
                    keyGenerator: (request) => {
                        return request.ownerId || request.ip
                    }
                }
                : false
        },
        schema: {
            hide: true, // dont show in swagger
            body: {
                type: 'object',
                properties: {
                    // The prompt to send to the assistant (required)
                    prompt: { type: 'string' },
                    // A correlation id for the transaction (required)
                    transactionId: { type: 'string' },
                    // Additional context for the function (optional)
                    context: { type: 'object', additionalProperties: true }
                },
                required: ['prompt', 'transactionId']
            },
            response: {
                200: {
                    type: 'object',
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    },
    async (request, reply) => {
        const method = request.params.method // the method to call at the assistant service
        if (/^[a-z0-9_-]+$/.test(method) === false) {
            return reply.code(400).send({ code: 'invalid_method', error: 'Invalid method name' })
        }

        // if this is a `flowfuse-tables-query` lets see if tables are enabled and try to get the schema hints
        const tablesFeatureEnabled = app.config.features.enabled('tables') && request.team.TeamType.getFeatureProperty('tables', false)
        const isTablesQuery = tablesFeatureEnabled && method === 'flowfuse-tables-query'
        const tablesCacheKey = request.team.hashid + '/tables/schema'
        if (isTablesQuery) {
            const { getTablesHints } = require('../../lib/assistant.js')
            if (!tablesSchemaCache.has(tablesCacheKey)) {
                const creds = await app.tables.getDatabases(request.team)
                if (creds && creds.length) {
                    const database = creds[0] // Get the first database
                    try {
                        // Get the DDL
                        const schemaData = await getTablesHints(app, request.team, database.hashid)
                        tablesSchemaCache.set(tablesCacheKey, schemaData)
                    } catch (error) {
                        tablesSchemaCache.set(tablesCacheKey, '')
                    }
                }
            }
        }

        // post to the assistant service
        try {
            let isTeamOnTrial
            if (app.billing && request.team.getSubscription) {
                const subscription = await request.team.getSubscription()
                isTeamOnTrial = subscription ? subscription.isTrial() : null
            }
            const data = { ...request.body }
            if (isTablesQuery) {
                data.context = data.context || {}
                data.context.tablesSchema = tablesSchemaCache.get(tablesCacheKey)
            }

            const response = await app.db.controllers.Assistant.invokeLLM(
                method, data, {
                    teamHashId: request.team.hashid,
                    instanceType: request.ownerType,
                    instanceId: request.ownerId,
                    additionalHeaders: request.headers,
                    isTeamOnTrial
                })

            reply.send(response.data)
        } catch (error) {
            reply.code(error.response?.status || 500).send({ code: error.response?.data?.code || 'unexpected_error', error: error.response?.data?.error || error.message })
        }
    })

    async function buildRequestHeaders (request) {
        const headers = {
            'ff-owner-type': request.ownerType,
            'ff-owner-id': request.ownerId,
            'ff-team-id': request.team.hashid
        }
        // include license information, team id and trial status so that we can make decisions in the assistant service
        const isLicensed = app.license?.active() || false
        const licenseType = isLicensed ? (app.license.get('dev') ? 'DEV' : 'EE') : 'CE'
        const tier = isLicensed ? app.license.get('tier') : null
        headers['ff-license-active'] = isLicensed
        headers['ff-license-type'] = licenseType
        headers['ff-license-tier'] = tier
        if (app.billing && request.team.getSubscription) {
            const subscription = await request.team.getSubscription()
            headers['ff-team-trial'] = subscription ? subscription.isTrial() : null
        }
        if (serviceToken) {
            headers.Authorization = `Bearer ${serviceToken}`
        }
        if (request.headers.accept) {
            headers.Accept = request.headers.accept
        }
        if (request.headers['user-agent']) {
            headers['User-Agent'] = request.headers['user-agent']
        }
        return headers
    }

    function buildAssetResponseHeaders (response) {
        // A list of headers to pass through from the backend assistant asset service to the client.
        // They are only added if they are present in the response.
        // This is to ensure we only pass through headers that are relevant (and avoid passing through sensitive headers).
        const ASSET_HEADERS_TO_PROXY = [
            'content-type', 'content-length', 'date', 'expires',
            'last-modified', 'cache-control', 'vary', 'accept-ranges', 'age'
        ]
        const headers = {}
        const sourceHeaders = response.headers || response // handles both Axios and cached object headers
        for (const headerName of ASSET_HEADERS_TO_PROXY) {
            if (sourceHeaders[headerName]) {
                headers[headerName] = sourceHeaders[headerName]
            }
        }
        return headers
    }
}
