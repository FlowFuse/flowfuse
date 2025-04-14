const crypto = require('crypto')

const cookie = require('@fastify/cookie')
const csrf = require('@fastify/csrf-protection')
const helmet = require('@fastify/helmet')
const { ProfilingIntegration } = require('@sentry/profiling-node')
const fastify = require('fastify')

const auditLog = require('./auditLog')
const comms = require('./comms')
const config = require('./config') // eslint-disable-line n/no-unpublished-require
const containers = require('./containers')
const db = require('./db')
const ee = require('./ee')
const housekeeper = require('./housekeeper')
const license = require('./licensing')
const notifications = require('./notifications')
const postoffice = require('./postoffice')
const product = require('./product')
const routes = require('./routes')
const settings = require('./settings')
const { finishSetup } = require('./setup')

require('dotenv').config()

const generatePassword = () => {
    const charList = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$'
    return Array.from(crypto.randomFillSync(new Uint32Array(8))).map(x => charList[x % charList.length]).join('')
}

async function createAdminAccessToken (server, userId) {
    const { token } = await server.db.controllers.AccessToken.createPersonalAccessToken(userId, '', null, 'Admin Access Token')
    server.log.info(`[SETUP] token: ${token}`)
}

async function createAdminUser (server) {
    if (await server.db.models.User.count() !== 0) {
        return
    }

    const password = process.env.FF_ADMIN_PASSWORD || generatePassword()
    const { id: userId } = await server.db.models.User.create({
        username: 'ff-admin',
        name: 'Default Admin',
        email: 'admin@example.com',
        email_verified: true,
        password,
        admin: true,
        password_expired: true
    })
    server.log.info('[SETUP] Created default Admin User')
    server.log.info('[SETUP] username: ff-admin')
    server.log.info(`[SETUP] password: ${password}`)

    if (server.config.create_admin_access_token) {
        await createAdminAccessToken(server, userId)
    }
}

// type defs for JSDoc and VSCode Intellisense

/**
 * @typedef {fastify.FastifyInstance} FastifyInstance
 * @typedef {fastify.FastifyRequest} FastifyRequest
 * @typedef {fastify.FastifyReply} FastifyReply
 */

/**
 * The Forge/fastify app instance.
 * @typedef {FastifyInstance} ForgeApplication
 * @alias app - The Fastify app instance
 */

/** @type {ForgeApplication} */
module.exports = async (options = {}) => {
    const runtimeConfig = config.init(options)
    const loggerConfig = {
        formatters: {
            level: (label) => {
                return { level: label.toUpperCase() }
            },
            bindings: (bindings) => {
                return { }
            }
        },
        timestamp: require('pino').stdTimeFunctions.isoTime,
        level: runtimeConfig.logging.level,
        serializers: {
            res (reply) {
                const response = {
                    statusCode: reply.statusCode,
                    request: {
                        user: reply.request?.session?.User?.username,
                        ownerId: undefined,
                        ownerType: undefined,
                        url: reply.request?.raw?.url,
                        method: reply.request?.method,
                        remoteAddress: reply.request?.ip,
                        remotePort: reply.request?.socket.remotePort
                    }
                }
                if (reply.request?.session?.ownerType) {
                    switch (reply.request?.session?.ownerType) {
                    case 'team':
                        response.request.ownerId = server.db.models.Team.encodeHashid(reply.request?.session?.ownerId)
                        response.request.ownerType = 'team'
                        break
                    case 'device':
                        response.request.ownerId = server.db.models.Device.encodeHashid(reply.request?.session?.ownerId)
                        response.request.ownerType = 'device'
                        break
                    case 'project':
                    case 'instance':
                        response.request.ownerId = reply.request?.session?.ownerId
                        response.request.ownerType = reply.request?.session?.ownerType
                        break
                    default:
                        // Don't log the id as we don't know how to hash it
                        // Log the type so we can spot cases we aren't handling and address it
                        response.request.ownerType = reply.request?.session?.ownerType
                    }
                }
                return response
            }
        }
    }
    if (runtimeConfig.logging.pretty !== false) {
        loggerConfig.transport = {
            target: 'pino-pretty',
            options: {
                translateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'",
                ignore: 'pid,hostname',
                singleLine: true
            }
        }
    }
    const server = fastify({
        forceCloseConnections: true,
        bodyLimit: 5242880,
        maxParamLength: 500,
        trustProxy: true,
        logger: loggerConfig,
        // Increase the default timeout
        pluginTimeout: 20000
    })

    if (runtimeConfig.telemetry.backend?.prometheus?.enabled) {
        const metricsPlugin = require('fastify-metrics')
        await server.register(metricsPlugin, { endpoint: '/metrics' })
    }

    if (runtimeConfig.telemetry.backend?.sentry?.dsn) {
        const environment = process.env.SENTRY_ENV ?? (process.env.NODE_ENV ?? 'unknown')
        const sentrySampleRate = environment === 'production' ? 0.1 : 0.5
        server.register(require('@immobiliarelabs/fastify-sentry'), {
            dsn: runtimeConfig.telemetry.backend.sentry.dsn,
            sendClientReports: true,
            environment,
            release: `flowfuse@${runtimeConfig.version}`,
            profilesSampleRate: sentrySampleRate, // relative to output from tracesSampler
            integrations: [
                new ProfilingIntegration()
            ],
            extractUserData (request) {
                const user = request.session?.User || request.user
                if (!user) {
                    return {}
                }
                const extractedUser = {
                    id: user.hashid,
                    username: user.username,
                    email: user.email,
                    name: user.name
                }

                return extractedUser
            },
            tracesSampler: (samplingContext) => {
                // Adjust sample rates for routes with high volumes, sorted descending by volume

                // Used for mosquitto auth
                if (samplingContext?.transactionContext?.name === 'POST /api/comms/auth/client' || samplingContext?.transactionContext?.name === 'POST /api/comms/auth/acl') {
                    return 0.001
                }

                // Used by nr-launcher and for nr-auth
                if (samplingContext?.transactionContext?.name === 'GET POST /account/token') {
                    return 0.01
                }

                // Common endpoints in app (list devices by team, list devices by project)
                if (samplingContext?.transactionContext?.name === 'GET /api/v1/teams/:teamId/devices' || samplingContext?.transactionContext?.name === 'GET /api/v1/projects/:instanceId/devices') {
                    return 0.01
                }

                // Used by device editor device tunnel
                if (samplingContext?.transactionContext?.name === 'GET /api/v1/devices/:deviceId/editor/proxy/*') {
                    return 0.01
                }

                // Prometheus scraping
                if (samplingContext?.transactionContext?.name === 'GET /metrics') {
                    return 0.01
                }

                // OAuth check
                if (samplingContext?.transactionContext?.name === 'GET /account/check/:ownerType/:ownerId') {
                    return 0.01
                }

                return sentrySampleRate
            }
        })
    }

    server.addHook('onError', async (request, reply, error) => {
        // Useful for debugging when a route goes wrong
        // console.error(error.stack)
    })

    try {
        // Config : loads environment configuration
        await server.register(config.attach, options)

        // Test Only. Permit access to app.routes - for evaluating routes in tests
        if (options.config?.test?.fastifyRoutes) {
            // since @fastify/routes is a dev dependency, we only load it when requested in test
            server.register(require('@fastify/routes')) // eslint-disable-line n/no-unpublished-require
        }

        // Rate Limits: rate limiting for the server end points
        if (server.config.rate_limits?.enabled) {
            // for rate_limits, see [routes/rateLimits.js].getLimits()
            await server.register(require('@fastify/rate-limit'), server.config.rate_limits)
        }

        // DB : the database connection/models/views/controllers
        await server.register(db)
        // Settings
        await server.register(settings)
        // License
        await server.register(license)
        // Audit Logging
        await server.register(auditLog)

        // Housekeeper
        await server.register(housekeeper)

        // HTTP Server configuration
        if (!server.settings.get('cookieSecret')) {
            await server.settings.set('cookieSecret', server.db.utils.generateToken(12))
        }
        await server.register(cookie, {
            secret: server.settings.get('cookieSecret')
        })
        await server.register(csrf, { cookieOpts: { _signed: true, _httpOnly: true } })

        let contentSecurityPolicy = false
        if (runtimeConfig.content_security_policy?.enabled) {
            if (!runtimeConfig.content_security_policy.directives) {
                contentSecurityPolicy = {
                    directives: {
                        'base-uri': ["'self'"],
                        'default-src': ["'self'"],
                        'frame-src': ["'self'"],
                        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                        'worker-src': ["'self'", 'blob:'],
                        'connect-src': ["'self'"],
                        'img-src': ["'self'", 'data:', '*'],
                        'font-src': ["'self'", 'data:'],
                        'style-src': ["'self'", 'https:', "'unsafe-inline'"],
                        'upgrade-insecure-requests': null,
                        'frame-ancestors': ["'self'"]
                    }
                }
                if (runtimeConfig.domain) {
                    contentSecurityPolicy.directives['default-src'].push(`*.${runtimeConfig.domain}`)
                    contentSecurityPolicy.directives['frame-src'].push(`*.${runtimeConfig.domain}`)
                }
            } else {
                contentSecurityPolicy = {
                    directives: runtimeConfig.content_security_policy.directives
                }
            }

            if (runtimeConfig.content_security_policy.report_only) {
                contentSecurityPolicy.reportOnly = true
                if (runtimeConfig.content_security_policy.report_uri) {
                    contentSecurityPolicy.directives['report-uri'] = runtimeConfig.content_security_policy.report_uri
                }
            }

            if (runtimeConfig.broker?.public_url) {
                const mqttBrokerHost = new URL(runtimeConfig.broker?.public_url).host
                if (contentSecurityPolicy.directives['connect-src'] && Array.isArray(contentSecurityPolicy.directives['connect-src'])) {
                    contentSecurityPolicy.directives['connect-src'].push(mqttBrokerHost)
                } else {
                    contentSecurityPolicy.directives['connect-src'] = [mqttBrokerHost]
                }
            }

            if (runtimeConfig.telemetry.frontend?.plausible?.domain) {
                if (contentSecurityPolicy.directives['script-src'] && Array.isArray(contentSecurityPolicy.directives['script-src'])) {
                    contentSecurityPolicy.directives['script-src'].push('plausible.io')
                } else {
                    contentSecurityPolicy.directives['script-src'] = ['plausible.io']
                }
            }
            if (runtimeConfig.telemetry?.frontend?.posthog?.apikey) {
                // ref: https://posthog.com/docs/advanced/content-security-policy
                const posthogHost = '*.posthog.com'
                if (contentSecurityPolicy.directives['script-src'] && Array.isArray(contentSecurityPolicy.directives['script-src'])) {
                    contentSecurityPolicy.directives['script-src'].push(posthogHost)
                } else {
                    contentSecurityPolicy.directives['script-src'] = [posthogHost]
                }
                if (contentSecurityPolicy.directives['connect-src'] && Array.isArray(contentSecurityPolicy.directives['connect-src'])) {
                    contentSecurityPolicy.directives['connect-src'].push(posthogHost)
                } else {
                    contentSecurityPolicy.directives['connect-src'] = [posthogHost]
                }
            }
            if (runtimeConfig.telemetry?.frontend?.sentry) {
                if (contentSecurityPolicy.directives['connect-src'] && Array.isArray(contentSecurityPolicy.directives['connect-src'])) {
                    contentSecurityPolicy.directives['connect-src'].push('*.ingest.sentry.io')
                } else {
                    contentSecurityPolicy.directives['connect-src'] = ['*.ingest.sentry.io']
                }
            }
            if (runtimeConfig.telemetry?.frontend?.google) {
                const googleDomains = [
                    'www.googletagmanager.com',
                    'www.google.com',
                    'www.google.co.uk',
                    'google.com',
                    'googleads.g.doubleclick.net',
                    'www.googleservices.com',
                    'www.googleadservices.com'
                ]
                if (contentSecurityPolicy.directives['script-src'] && Array.isArray(contentSecurityPolicy.directives['script-src'])) {
                    contentSecurityPolicy.directives['script-src'].push(...googleDomains)
                } else {
                    contentSecurityPolicy.directives['script-src'] = googleDomains
                }
                const googleConnectDomains = [
                    'www.google.com',
                    'google.com'
                ]
                if (contentSecurityPolicy.directives['connect-src'] && Array.isArray(contentSecurityPolicy.directives['connect-src'])) {
                    contentSecurityPolicy.directives['connect-src'].push(...googleConnectDomains)
                } else {
                    contentSecurityPolicy.directives['connect-src'] = googleConnectDomains
                }
                const googleFrameDomains = [
                    'td.doubleclick.net'
                ]
                if (contentSecurityPolicy.directives['frame-src'] && Array.isArray(contentSecurityPolicy.directives['frame-src'])) {
                    contentSecurityPolicy.directives['frame-src'].push(...googleFrameDomains)
                } else {
                    contentSecurityPolicy.directives['frame-src'] = googleFrameDomains
                }
                const googleFontDomains = [
                    'fonts.gstatic.com'
                ]
                if (contentSecurityPolicy.directives['font-src'] && Array.isArray(contentSecurityPolicy.directives['font-src'])) {
                    contentSecurityPolicy.directives['font-src'].push(...googleFontDomains)
                } else {
                    contentSecurityPolicy.directives['font-src'] = googleFontDomains
                }
            }
            if (runtimeConfig.support?.enabled && runtimeConfig.support.frontend?.hubspot?.trackingcode) {
                const hubspotDomains = [
                    '*.hs-analytics.net',
                    '*.hs-banner.com',
                    '*.hs-scripts.com',
                    '*.hscollectedforms.net',
                    '*.hubspot.com',
                    '*.usemessages.com',
                    '*.hubspotfeedback.com',
                    '*.hsadspixel.net',
                    '*.hsforms.net',
                    '*.hsforms.com'
                ]
                if (contentSecurityPolicy.directives['script-src'] && Array.isArray(contentSecurityPolicy.directives['script-src'])) {
                    contentSecurityPolicy.directives['script-src'].push(...hubspotDomains)
                } else {
                    contentSecurityPolicy.directives['script-src'] = hubspotDomains
                }
                const hubspotConnectDomains = [
                    '*.hubspot.com',
                    '*.hubapi.com',
                    '*.hsforms.com',
                    '*.hubspot.com',
                    '*.hs-banner.com',
                    '*.hscollectedforms.net',
                    '*.hs-embed-reporting.com'
                ]
                if (contentSecurityPolicy.directives['connect-src'] && Array.isArray(contentSecurityPolicy.directives['connect-src'])) {
                    contentSecurityPolicy.directives['connect-src'].push(...hubspotConnectDomains)
                } else {
                    contentSecurityPolicy.directives['connect-src'] = hubspotConnectDomains
                }
                const hubspotFrameDomains = [
                    '*.hubspot.com',
                    '*.hsforms.com',
                    '*.hsforms.net'
                ]
                if (contentSecurityPolicy.directives['frame-src'] && Array.isArray(contentSecurityPolicy.directives['frame-src'])) {
                    contentSecurityPolicy.directives['frame-src'].push(...hubspotFrameDomains)
                } else {
                    contentSecurityPolicy.directives['frame-src'] = hubspotFrameDomains
                }
            }
        }

        let strictTransportSecurity = false
        if (runtimeConfig.base_url.startsWith('https://')) {
            strictTransportSecurity = {
                includeSubDomains: false,
                preload: true,
                maxAge: 2592000
            }
        }

        await server.register(helmet, {
            global: true,
            contentSecurityPolicy,
            crossOriginEmbedderPolicy: false,
            crossOriginOpenerPolicy: false,
            crossOriginResourcePolicy: false,
            hidePoweredBy: true,
            strictTransportSecurity,
            frameguard: {
                action: 'sameorigin'
            },
            referrerPolicy: {
                policy: 'origin-when-cross-origin'
            }
        })

        // Routes : the HTTP routes
        await server.register(routes, { logLevel: server.config.logging.http })
        // Post Office : handles email
        await server.register(postoffice)
        await server.register(notifications)
        // Product service handles reporting to PostHog
        await server.register(product, runtimeConfig.telemetry.frontend?.posthog)
        // Comms : real-time communication broker
        await server.register(comms)
        // Containers:
        await server.register(containers)

        await server.register(ee)

        await server.ready()

        // NOTE: This is only likely to do anything after a db upgrade where the settingsHashes are cleared.
        server.db.models.Device.recalculateSettingsHashes(false) // update device.settingsHash if null

        // Ensure The defaultTeamType is in place
        await server.db.controllers.TeamType.ensureDefaultTypeExists()

        // Create ff-admin
        if (server.config.create_admin && !server.settings.get('setup:initialised')) {
            await createAdminUser(server)
            await finishSetup(server)
        }

        return server
    } catch (err) {
        server.log.error(`Failed to start: ${err.toString()}`)
        server.log.error(err.stack)
        try {
            await server.close()
        } catch (err2) {
            server.log.error(`Failed to shutdown: ${err2.toString()}`)
            server.log.error(err2.stack)
        }
        throw err
    }
}
// random change to trigger backend tests
