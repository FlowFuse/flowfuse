const { defineConfig } = require('cypress')

const shared = require('./cypress-shared.config.js')

module.exports = defineConfig({
    ...shared,
    e2e: {
        ...shared.e2e,
        ...{
            baseUrl: 'http://localhost:3002',
            specPattern: 'test/e2e/frontend/cypress/tests-ee'
        }
    },
    env: {
        mailpitUrl: `http://localhost:${process.env.SMTP_WEB_PORT || '8026'}/`
    }
})
