const fastify = require('fastify')
const db = require('./db')
const routes = require('./routes')
const config = require('./config')
const settings = require('./settings')
const license = require('./licensing')
const containers = require('./containers')
const cookie = require('@fastify/cookie')
const csrf = require('@fastify/csrf-protection')
const postoffice = require('./postoffice')
const monitor = require('./monitor')
const ee = require('./ee')
const helmet = require('@fastify/helmet')

module.exports = async (options = {}) => {
    // TODO: Defer logger configuration until after `config` module is registered
    //       so that we can pull it from user-provided config
    let loggerLevel = 'info'
    if (options.config && options.config.logging) {
        loggerLevel = options.config.logging.level || 'info'
    }
    const server = fastify({
        maxParamLength: 500,
        logger: {
            level: loggerLevel,
            prettyPrint: {
                translateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'",
                ignore: 'pid,hostname'
            }
        }
    })

    server.addHook('onError', async (request, reply, error) => {
        // Useful for debugging when a route goes wrong
        // console.log(error.stack)
    })

    try {
        // Config : loads environment configuration
        await server.register(config, options)
        if (server.config.logging?.level) {
            server.log.level = server.config.logging.level
        }
        // DB : the database connection/models/views/controllers
        await server.register(db)
        // Settings
        await server.register(settings)
        // Monitor
        await server.register(monitor)
        // License
        await server.register(license)

        // HTTP Server configuration
        if (!server.settings.get('cookieSecret')) {
            await server.settings.set('cookieSecret', server.db.utils.generateToken(12))
        }
        await server.register(cookie, {
            secret: server.settings.get('cookieSecret')
        })
        await server.register(csrf, { cookieOpts: { _signed: true, _httpOnly: true } })
        await server.register(helmet, {
            global: true,
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false,
            crossOriginOpenerPolicy: false,
            crossOriginResourcePolicy: false,
            hidePoweredBy: false,
            hsts: false,
            frameguard: {
                action: 'deny'
            }
        })

        // Routes : the HTTP routes
        await server.register(routes, { logLevel: 'warn' })
        // Post Office : handles email
        await server.register(postoffice)
        // Containers:
        await server.register(containers)

        await server.register(ee)

        await server.ready()

        return server
    } catch (err) {
        server.log.error(`Failed to start: ${err.toString()}`)
        console.log(err)
        throw err
    }
}
