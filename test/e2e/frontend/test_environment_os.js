/* eslint-disable n/no-process-exit */
'use strict'

const smtp = require('./environments/smtp.js')
const app = require('./environments/standard.js')

const { LocalTransport } = require('flowforge-test-utils/forge/postoffice/localTransport.js')

async function emailConfig () {
    switch (true) {
    case !process.env.NO_SMTP_SERVER && !process.env.GITHUB_ACTIONS:
        // running locally with docker smtp container
        await smtp({ smtpPort: 1025, webPort: 8025 })
        return {
            enabled: true,
            debug: true,
            smtp: {
                host: 'localhost',
                port: 1025,
                secure: false,
                debug: true
            }
        }
    case process.env.GITHUB_ACTIONS === 'true':
        // running in CI
        return {
            enabled: true,
            debug: true,
            smtp: {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: false,
                debug: true
            }
        }
    default:
        // running locally with LocalTransport
        return {
            enabled: true,
            debug: true,
            transport: new LocalTransport()
        }
    }
}

(async function () {
    const PORT = 3001

    const flowforge = await app({}, {
        host: 'localhost',
        port: PORT,
        email: await emailConfig()
    })

    flowforge.listen({ port: PORT }, function (err, address) {
        console.info(`OS Environment running at http://localhost:${PORT}`)
        if (err) {
            console.error(err)
            process.exit(1)
        }
    })
})()
