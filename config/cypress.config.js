const { defineConfig } = require('cypress')

module.exports = defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        experimentalSessionAndOrigin: true,
        downloadsFolder: 'test/e2e/frontend/cypress/downloads',
        fixturesFolder: 'test/e2e/frontend/cypress/fixtures',
        specPattern: 'test/e2e/frontend/cypress/tests',
        screenshotsFolder: 'test/e2e/frontend/cypress/screenshots',
        supportFile: 'test/e2e/frontend/cypress/support/index.js',
        videosFolder: 'test/e2e/frontend/cypress/videos'
    }
})
