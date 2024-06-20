/* eslint-disable n/no-process-exit */
'use strict'

const smtp = require('./environments/smtp.js')
const app = require('./environments/standard.js')

;(async function () {
    const PORT = 3001
    const smtpConfig = {
        smtpPort: 1025,
        webPort: 8025
    }

    await smtp({ smtpPort: smtpConfig.smtpPort, webPort: smtpConfig.webPort })

    const flowforge = await app({}, {
        host: 'localhost',
        port: PORT,
        email: {
            enabled: true,
            debug: true,
            smtp: {
                host: 'localhost',
                port: smtpConfig.smtpPort,
                secure: false,
                debug: true
            }
        }
    })

    flowforge.listen({ port: PORT }, function (err, address) {
        console.info(`OS Environment running at http://localhost:${PORT}`)
        if (err) {
            console.error(err)
            process.exit(1)
        }
    })
})()
