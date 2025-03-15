#!/usr/bin/env node
/* eslint-disable n/no-process-exit */
'use strict'

const semver = require('semver')

const forge = require('./forge')

/**
  * The main entry point to the FlowFuse application.
  *
  * This creates the Fastify server, registers our plugins and starts it listen
  * on `process.env.PORT`.
  *
  * @namespace forge
  */

;(async function () {
    if (!semver.satisfies(process.version, '>=16.0.0')) {
        console.error(`FlowFuse requires at least NodeJS v16, ${process.version} found`)
        process.exit(1)
    }

    // Check for repl arg. We could use parseArgs from node:util if on >=16.17.0,
    // but risk someone is on older 16.x without it. So for now, just look for
    // this one flag
    const enableRepl = process.argv.includes('--repl')
    let server
    try {
        server = await forge()

        // Setup shutdown event handling
        let stopping = false
        async function exitWhenStopped () {
            if (!stopping) {
                stopping = true
                server.log.info('Stopping FlowFuse platform')
                await server.close()
                server.log.info('FlowFuse platform stopped')
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
                server.log.info('* To finish setting up FlowFuse, open this url:   *')
                server.log.info(`*   ${setupURL.padEnd(47, ' ')}*`)
                server.log.info('****************************************************')
            } else {
                server.log.info('****************************************************')
                server.log.info('* FlowFuse is now running and can be accessed at: *')
                server.log.info(`*   ${server.config.base_url.padEnd(47, ' ')}*`)
                server.log.info('****************************************************')
            }
            if (enableRepl) {
                const repl = require('repl')
                const replServer = repl.start('FF => ')
                replServer.context.app = server
            }
        })
    } catch (err) {
        console.error(err)
        process.exitCode = 1
        try {
            if (server) {
                await server.close()
            }
        } catch (err) {
            console.error('Error shutting down:', err.toString())
        }
    }
})()
