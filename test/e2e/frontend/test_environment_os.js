/* eslint-disable n/no-process-exit */
'use strict'

const smtp = require('./environments/smtp.js')
const app = require('./environments/standard.js')

async function emailConfig () {
    if (!process.env.NO_SMTP_SERVER || process.env.NO_SMTP_SERVER === 'false') {
        const smtpConfig = {
            smtpPort: process.env.SMTP_PORT || 1025,
            webPort: process.env.SMTP_WEB_PORT || 8025
        }
        await smtp({
            smtpPort: smtpConfig.smtpPort,
            webPort: smtpConfig.webPort
        })
        return {
            enabled: true,
            debug: true,
            smtp: {
                host: process.env.SMTP_HOST || 'localhost',
                port: smtpConfig.smtpPort,
                secure: false,
                debug: true
            }
        }
    } else {
        const { LocalTransport } = require('flowforge-test-utils/forge/postoffice/localTransport.js')
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
