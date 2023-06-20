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
const { readFileSync } = require('fs')
const path = require('path')

const fp = require('fastify-plugin')
module.exports = fp(async function (app, opts, done) {
    await app.register(require('@fastify/swagger'), {
        swagger: {
            info: {
                title: 'FlowForge Platform API',
                description: 'API documentation for interacting with the FlowForge platform',
                version: app.config.version
            },
            externalDocs: {
                url: 'https://flowforge.com/docs',
                description: 'Find more info here'
            }
        },
        hideUntagged: true
    })

    await app.register(require('@fastify/swagger-ui'), {
        routePrefix: '/api/',
        logo: {
            type: 'image/png',
            content: readFileSync(path.join(__dirname, '../../frontend/src/images/ff-logo--wordmark-caps--dark.png'))
        },
        theme: {
            title: 'FlowForge API Documentation',
            favicon: [
                {
                    filename: 'favicon.png',
                    rel: 'icon',
                    sizes: '32x32',
                    type: 'image/png',
                    content: readFileSync(path.join(__dirname, '../../frontend/public/favicon-32x32.png'))
                }
            ]
        },
        hideUntagged: true
    })

    await app.register(require('@fastify/websocket'))
    await app.register(require('./auth'), { logLevel: app.config.logging.http })
    await app.register(require('./api'), { prefix: '/api/v1', logLevel: app.config.logging.http })
    await app.register(require('./ui'), { logLevel: app.config.logging.http })
    await app.register(require('./setup'), { logLevel: app.config.logging.http })
    await app.register(require('./storage'), { prefix: '/storage', logLevel: app.config.logging.http })
    await app.register(require('./logging'), { prefix: '/logging', logLevel: app.config.logging.http })
    done()
})
