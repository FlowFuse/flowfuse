/**
 * Routes releated to the EE forge api
 * @param {import('../../forge').ForgeApplication} app - forge application
 * @namespace api
 * @memberof forge.ee
 */
module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)
    if (app.config.billing) {
        await app.register(require('./billing'), { prefix: '/ee/billing', logLevel: app.config.logging.http })
    }
    await app.register(require('./sharedLibrary'), { logLevel: app.config.logging.http })
    await app.register(require('./pipeline'), { prefix: '/api/v1', logLevel: app.config.logging.http })
    await app.register(require('./pipeline/teamPipelines.js'), { prefix: '/api/v1/teams/:teamId/pipelines', logLevel: app.config.logging.http })
    await app.register(require('./deviceEditor'), { prefix: '/api/v1/devices/:deviceId/editor', logLevel: app.config.logging.http })
    await app.register(require('./bom/application.js'), { prefix: '/api/v1/applications', logLevel: app.config.logging.http })
    await app.register(require('./bom/team.js'), { prefix: '/api/v1/teams', logLevel: app.config.logging.http })

    await app.register(require('./flowBlueprints'), { prefix: '/api/v1/flow-blueprints', logLevel: app.config.logging.http })

    if (app.license.get('tier') === 'enterprise') {
        await app.register(require('./applicationDeviceGroups'), { prefix: '/api/v1/applications/:applicationId/device-groups', logLevel: app.config.logging.http })
        await app.register(require('./teamDeviceGroups'), { prefix: '/api/v1/teams/:teamId/device-groups', logLevel: app.config.logging.http })
        await app.register(require('./ha'), { prefix: '/api/v1/projects/:projectId/ha', logLevel: app.config.logging.http })
        await app.register(require('./protectedInstance'), { prefix: '/api/v1/projects/:projectId/protectInstance', logLevel: app.config.logging.http })
        await app.register(require('./mfa'), { prefix: '/api/v1', logLevel: app.config.logging.http })
        await app.register(require('./httpTokens'), { prefix: '/api/v1/projects/:projectId/httpTokens', logLevel: app.config.logging.http })
        await app.register(require('./customHostnames'), { prefix: '/api/v1/projects/:projectId/customHostname', logLevel: app.config.logging.http })
        await app.register(require('./staticAssets'), { prefix: '/api/v1/projects/:projectId/files', logLevel: app.config.logging.http })
        await app.register(require('./projectHistory'), { prefix: '/api/v1/projects/:instanceId/history', logLevel: app.config.logging.http })
        await app.register(require('./deviceHistory'), { prefix: '/api/v1/devices/:deviceId/history', logLevel: app.config.logging.http })
        await app.register(require('./teamBroker'), { prefix: '/api/v1/teams/:teamId/broker', logLevel: app.config.logging.http })
        await app.register(require('./teamBroker/3rdPartyBroker'), { prefix: '/api/v1/teams/:teamId/brokers', logLevel: app.config.logging.http })
        if (app.config.npmRegistry?.enabled) {
            await app.register(require('./catalogues'), { prefix: '/api/v1/teams/:teamId', logLevel: app.config.logging.http })
        }
        await app.register(require('./gitops'), { prefix: '/api/v1/teams/:teamId/git', logLevel: app.config.logging.http })
        await app.register(require('./resource'), { prefix: '/api/v1/projects/:instanceId/resources', logLevel: app.config.logging.http })
        if (app.config.tables?.enabled) {
            await app.register(require('./tables'), { prefix: '/api/v1/teams/:teamId/databases', logLevel: app.config.logging.http })
        }

        // Important: keep SSO last to avoid its error handling polluting other routes.
        await app.register(require('./sso'), { logLevel: app.config.logging.http })
    }
}
