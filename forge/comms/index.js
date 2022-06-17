const fp = require('fastify-plugin')

module.exports = fp(async function (app, _opts, next) {
    if (app.config.broker && app.config.broker.url) {
        const { SecurityManager } = require('./securityManager')
        const securityManager = new SecurityManager(app)
        await securityManager.init()

        const { CommsClient } = require('./commsClient')
        const commsClient = new CommsClient(app, securityManager)
        await commsClient.init()

        app.decorate('comms', {
            createTeam: securityManager.createTeam,
            deleteTeam: securityManager.deleteTeam,
            createProjectClient: securityManager.createProjectClient,
            deleteProjectClient: securityManager.deleteProjectClient,
            refreshProjectClientCredentials: securityManager.refreshProjectClientCredentials,
            createDeviceClient: securityManager.createDeviceClient,
            deleteDeviceClient: securityManager.deleteDeviceClient,
            addDeviceClientToProject: securityManager.addDeviceClientToProject,
            removeDeviceClientFromProject: securityManager.removeDeviceClientFromProject,
            refreshDeviceClientCredentials: securityManager.refreshDeviceClientCredentials
        })
    } else {
        app.log.warn('[comms] Broker not configured - comms unavailable')
    }
    next()
})
