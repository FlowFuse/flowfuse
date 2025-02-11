const fp = require('fastify-plugin')

module.exports = fp(async function (app, opts) {
    if (app.config.billing) {
        app.decorate('billing', await require('./billing').init(app))
    }
    require('./projectComms').init(app)
    require('./deviceEditor').init(app)
    require('./alerts').init(app)

    if (app.license.get('tier') === 'enterprise') {
        require('./ha').init(app)
        require('./protectedInstance').init(app)
        require('./customHostnames').init(app)
        app.decorate('sso', await require('./sso').init(app))
        require('./teamBroker').init(app)
        // Set the MFA Feature Flag
        app.config.features.register('mfa', true, true)
        // Set the Device Groups Feature Flag
        app.config.features.register('deviceGroups', true, true)
        // Set the Project History timeline Feature Flag
        app.config.features.register('projectHistory', true, true)
        // Set the Bill of Materials Feature Flag
        app.config.features.register('bom', true, true)
    }

    // Set the Team Library Feature Flag
    app.config.features.register('shared-library', true, true)

    // Set the DevOps Pipelines
    app.config.features.register('devops-pipelines', true, true)

    // Set the Custom Catalogs Flag
    app.config.features.register('customCatalogs', true, true)

    // Set the Device Auto Snapshot Feature Flag
    app.config.features.register('deviceAutoSnapshot', true, true)

    // Set the Instance Auto Snapshot Feature Flag
    app.config.features.register('instanceAutoSnapshot', true, true)

    // Set the Editor Limits Feature Flag
    app.config.features.register('editorLimits', true, true)
}, { name: 'app.ee.lib' })
