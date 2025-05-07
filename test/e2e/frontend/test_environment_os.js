/* eslint-disable n/no-process-exit */
'use strict'

const fs = require('fs')
const path = require('path')

const yaml = require('yaml')

const app = require('./environments/standard.js')

const configPath = path.join(process.cwd(), 'etc', 'flowforge.local.yml')
let e2eConfig = null

if (fs.existsSync(configPath)) {
    const configFile = fs.readFileSync(configPath, 'utf8')
    e2eConfig = yaml.parse(configFile).e2e
}

;(async function () {
    const PORT = 3001
    let emailConfig = null

    if (e2eConfig && e2eConfig.email && e2eConfig.email.os && e2eConfig.email.os.enabled) {
        const smtp = require('./environments/smtp')

        await smtp({ smtpPort: e2eConfig.email.os.smtp.port, webPort: e2eConfig.email.os.smtp.web_port })
        emailConfig = e2eConfig.email.os
    } else {
        emailConfig = {
            enabled: true,
            debug: true,
            smtp: {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: false,
                debug: true
            }
        }
    }

    const flowforge = await app({}, {
        host: 'localhost',
        port: PORT,
        email: emailConfig
    })

    flowforge.listen({ port: PORT }, function (err, address) {
        console.info(`OS Environment running at http://localhost:${PORT}`)
        if (err) {
            console.error(err)
            process.exit(1)
        }
    })
})()
