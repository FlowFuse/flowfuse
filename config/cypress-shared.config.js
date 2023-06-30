module.exports = {
    viewportWidth: 1024,
    viewportHeight: 768,
    e2e: {
        experimentalSessionAndOrigin: true,
        downloadsFolder: 'test/e2e/frontend/cypress/downloads',
        fixturesFolder: 'test/e2e/frontend/cypress/fixtures',
        screenshotsFolder: 'test/e2e/frontend/cypress/screenshots',
        supportFile: 'test/e2e/frontend/cypress/support/index.js',
        videosFolder: 'test/e2e/frontend/cypress/videos'
    }
}
