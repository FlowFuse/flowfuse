#!/usr/bin/env node
'use strict'

const semver = require('semver')
const forge = require('./forge')

/**
  * The main entry point to the FlowForge application.
  *
  * This creates the Fastify server, registers our plugins and starts it listen
  * on `process.env.PORT`.
  *
  * @namespace forge
  */

;(async function () {
    if (!semver.satisfies(process.version, '>=16.0.0')) {
        console.error(`FlowForge requires at least NodeJS v16, ${process.version} found`)
        process.exit(1)
    }

    try {
        const server = await forge()

        // Setup shutdown event handling
        let stopping = false
        async function exitWhenStopped () {
            if (!stopping) {
                stopping = true
                server.log.info('Stopping FlowForge platform')
                await server.close()
                server.log.info('FlowForge platform stopped')
                process.exit(0)
            }
        }
        process.on('SIGINT', exitWhenStopped)
        process.on('SIGTERM', exitWhenStopped)
        process.on('SIGHUP', exitWhenStopped)
        process.on('SIGUSR2', exitWhenStopped) // for nodemon restart
        process.on('SIGBREAK', exitWhenStopped)
        process.on('message', function (m) { // for PM2 under window with --shutdown-with-message
            if (m === 'shutdown') { exitWhenStopped() }
        })

        // Start the server
        server.listen({ port: server.config.port, host: server.config.host }, function (err, address) {
            if (err) {
                console.error(err)
                process.exit(1)
            }

            if (!server.settings.get('setup:initialised')) {
                const setupURL = server.config.base_url.replace(/\/$/, '') + '/setup'
                server.log.info('****************************************************')
                server.log.info('* To finish setting up FlowForge, open this url:   *')
                server.log.info(`*   ${setupURL.padEnd(47, ' ')}*`)
                server.log.info('****************************************************')
            } else {
                server.log.info('****************************************************')
                server.log.info('* FlowForge is now running and can be accessed at: *')
                server.log.info(`*   ${server.config.base_url.padEnd(47, ' ')}*`)
                server.log.info('****************************************************')
            }
        })
    } catch (err) {
        console.error(err)
        process.exitCode = 1
    }
})()
