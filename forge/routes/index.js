/**
 * All of the HTTP routes the forge server exposes.
 *
 * This includes three components:
 *
 *  - {@link forge.routes.session session} - routes related to session handling, login/out etc
 *  - {@link forge.routes.api api} - routes related to the forge api
 *  - {@link forge.routes.ui ui} - routes that serve the forge frontend web app
 *
 * @namespace routes
 * @memberof forge
 */
const fp = require('fastify-plugin')

const generatePassword = () => {
    const charList = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$'
    return Array.from(require('crypto').randomFillSync(new Uint32Array(8))).map(x => charList[x % charList.length]).join('')
}

async function createAdminUser (app) {
    if (!await app.db.models.User.count() === 0) return

    const password = process.env.FF_ADMIN_PASSWORD || generatePassword()
    await app.db.models.User.create({
        username: 'ff-admin',
        name: 'Default Admin',
        email: 'admin@example.com',
        email_verified: true,
        password,
        admin: true,
        password_expired: true
    })
    app.log.info('[SETUP] Created default Admin User')
    app.log.info('[SETUP] username: ff-admin')
    app.log.info(`[SETUP] password: ${password}`)
}

module.exports = fp(async function (app, opts, done) {
    app.decorate('getPaginationOptions', (request, defaults) => {
        const result = { ...defaults, ...request.query }
        if (result.query) {
            result.query = result.query.trim()
        }
        return result
    })

    if (app.config.create_admin) createAdminUser(app)

    await app.register(require('./api-docs'))
    await app.register(require('@fastify/websocket'))
    await app.register(require('./auth'), { logLevel: app.config.logging.http })
    await app.register(require('./api'), { prefix: '/api/v1', logLevel: app.config.logging.http })
    await app.register(require('./ui'), { logLevel: app.config.logging.http })
    await app.register(require('./setup'), { logLevel: app.config.logging.http })
    await app.register(require('./storage'), { prefix: '/storage', logLevel: app.config.logging.http })
    await app.register(require('./logging'), { prefix: '/logging', logLevel: app.config.logging.http })
    done()
})
