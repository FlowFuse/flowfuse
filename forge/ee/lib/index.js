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
        await require('./teamBroker').init(app)
        app.decorate('gitops', await require('./gitops').init(app))
        // Set the MFA Feature Flag
        app.config.features.register('mfa', true, true)
        // Set the Device Groups Feature Flag
        app.config.features.register('deviceGroups', true, true)
        // Set the Project History timeline Feature Flag
        app.config.features.register('projectHistory', true, true)
        // Set the Bill of Materials Feature Flag
        app.config.features.register('bom', true, true)
        if (app.config.npmRegistry?.enabled) {
            // Set npm Feature Flag
            app.config.features.register('npm', true, true)
        }
        if (app.config.tables?.enabled) {
            app.decorate('tables', await require('./tables').init(app))
        }
        app.config.features.register('certifiedNodes', true, true)
        app.config.features.register('ffNodes', true, true)
        app.config.features.register('rbacApplication', true, true)
        require('./autoUpdateStacks').init(app)
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

    // Set the Editor Limits Feature Flag
    app.config.features.register('generatedSnapshotDescription', true, true)

    // Set the assistant inline completions Feature Flag
    app.config.features.register('assistantInlineCompletions', true, true)

    // Set the expert assistant Feature Flag
    app.config.features.register('expertAssistant', app.config?.expert?.enabled ?? false, true)
}, { name: 'app.ee.lib' })
