module.exports.init = function (app) {
    if (app.config.driver.type === 'k8s' || app.config.driver.type === 'stub') {
        // Register ha flag as a private flag - no requirement to expose it in public settings
        app.config.features.register('ha', true)
    }
}
