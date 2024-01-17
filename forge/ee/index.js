const fp = require('fastify-plugin')

/**
 * Loads the FlowFuse EE components
 */
module.exports = fp(async function (app, opts) {
    // Load ee only if enabled in the license
    if (app.license.active()) {
        app.log.info('Loading EE Features')
        app.log.trace(' - EE Database models')
        await require('./db/index.js').init(app)
        app.log.trace(' - EE Routes')
        await app.register(require('./routes'), { logLevel: app.config.logging.http })
        app.log.trace(' - EE Libs')
        await app.register(require('./lib'))
        app.log.trace(' - EE Templates')
        app.postoffice.registerTemplate('LicenseReminder', require('./emailTemplates/LicenseReminder'))
        app.postoffice.registerTemplate('LicenseExpired', require('./emailTemplates/LicenseExpired'))
    }
}, { name: 'app.ee' })
