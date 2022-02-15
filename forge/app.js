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
        server.listen(server.config.port, '0.0.0.0', function (err, address) {
            if (err) {
                console.error(err)
                process.exit(1)
            }
        })
    } catch (err) {
        process.exitCode = 1
    }
})()
