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

    const server = await forge()

    // Start the server
    server.listen(server.config.port, '0.0.0.0', function (err, address) {
        if (err) {
            console.error(err)
            process.exit(1)
        }
    })
})()
