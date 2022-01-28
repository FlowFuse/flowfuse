#!/usr/bin/env node
'use strict'

const fastify = require('fastify')
const db = require('./db')
const routes = require('./routes')
const config = require('./config')
const settings = require('./settings')
const license = require('./licensing')
const containers = require('./containers')
const cookie = require('fastify-cookie')
const csrf = require('fastify-csrf')
const semver = require('semver')

const postoffice = require('./postoffice');

/**
  * The main entry point to the FlowForge application.
  *
  * This creates the Fastify server, registers our plugins and starts it listen
  * on `process.env.PORT`.
  *
  * @namespace forge
  */

(async function () {
    if (!semver.satisfies(process.version, '>=16.0.0')) {
        console.error(`FlowForge requires at least NodeJS v16, ${process.version} found`)
        process.exit(1)
    }

    const server = fastify({
        maxParamLength: 500,
        logger: {
            level: 'info',
            prettyPrint: {
                translateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'",
                ignore: 'pid,hostname'
            }
        }
    })

    server.addHook('onError', async (request, reply, error) => {
        // Useful for debugging when a route goes wrong
        console.log(error.stack)
    })

    // Config : loads environment configuration
    await server.register(config)
    // DB : the database connection/models/views/controllers
    await server.register(db)
    // Settings
    await server.register(settings)
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

    process.env.PORT = process.env.PORT || server.config.port || 3000
    if (!process.env.BASE_URL) {
        process.env.BASE_URL = `http://localhost:${process.env.PORT}`
    }
    if (!process.env.API_URL) {
        process.env.API_URL = process.env.BASE_URL
    }

    // Routes : the HTTP routes
    await server.register(routes, { logLevel: 'warn' })
    // Post Office : handles email
    await server.register(postoffice)
    // Containers:
    await server.register(containers)

    await server.ready()

    // Start the server
    server.listen(process.env.PORT, '0.0.0.0', function (err, address) {
        if (err) {
            console.error(err)
            process.exit(1)
        }
    })
})()
