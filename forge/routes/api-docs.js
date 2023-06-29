const { readFileSync } = require('fs')
const path = require('path')

const fp = require('fastify-plugin')
module.exports = fp(async function (app, opts, done) {
    await app.register(require('@fastify/swagger'), {
        openapi: {
            info: {
                title: 'FlowForge Platform API',
                description: 'API documentation for interacting with the FlowForge platform',
                version: app.config.version
            },
            externalDocs: {
                url: 'https://flowforge.com/docs',
                description: 'Find more info here'
            },
            tags: [
                { name: 'Authentication', description: 'Getting access to the platform' },
                { name: 'User', description: 'User routes' }
            ]
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

    app.addSchema({
        $id: 'APIStatus',
        type: 'object',
        properties: {
            status: { type: 'string' }
        }
    })
    app.addSchema({
        $id: 'APIError',
        type: 'object',
        properties: {
            code: { type: 'string' },
            error: { type: 'string' }
        }
    })
    app.addSchema({
        $id: 'PaginationParams',
        type: 'object',
        properties: {
            query: { type: 'string' },
            cursor: { type: 'string' },
            limit: { type: 'number' }
        }
    })

    app.addSchema({
        $id: 'PaginationMeta',
        type: 'object',
        properties: {
            next_cursor: { type: 'string' },
            previous_cursor: { type: 'string' }
        }
    })
    app.addSchema({
        $id: 'LinksMeta',
        type: 'object',
        properties: {
            self: { type: 'string' }
        }
    })

    done()
})
