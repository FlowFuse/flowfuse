const { defineConfig } = require('cypress')

const shared = require('./cypress-shared.config.js')

module.exports = defineConfig({
    ...shared,
    e2e: {
        ...shared.e2e,
        ...{
            baseUrl: 'http://localhost:3001',
            specPattern: 'test/e2e/frontend/cypress/tests'
        }
    }
})
