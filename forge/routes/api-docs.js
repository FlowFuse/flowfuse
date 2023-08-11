const { readFileSync, existsSync } = require('fs')
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
                { name: 'User', description: '' },
                { name: 'Teams', description: '' },
                { name: 'Team Types', description: '' },
                { name: 'Team Members', description: '' },
                { name: 'Team Invitations', description: '' },
                { name: 'Team Devices', description: '' },
                { name: 'Applications', description: '' },
                { name: 'Instances', description: '' },
                { name: 'Instance Types', description: '' },
                { name: 'Instance Actions', description: '' },
                { name: 'Devices', description: '' },
                { name: 'Snapshots', description: '' },
                { name: 'Pipelines', description: '' },
                { name: 'Stacks', description: '' },
                { name: 'Templates', description: '' },
                { name: 'Platform', description: '' },
                { name: 'Users', description: '' }
            ]
            // components: {
            //     securitySchemes: {
            //         BearerAuth: {
            //             type: 'http',
            //             scheme: 'bearer'
            //         },
            //         Cookie: {
            //             type: 'apiKey',
            //             in: 'cookie',
            //             name: 'sid'
            //         }
            //     }
            // },
            // security: [
            //     {
            //         BearerAuth: []
            //     },
            //     {
            //         Cookie: []
            //     }
            // ]
        },
        hideUntagged: true
    })

    const swaggerUIOptions = {
        routePrefix: '/api/',
        theme: {
            title: 'FlowForge API Documentation'
        },
        logLevel: 'silent',
        hideUntagged: true,
        uiConfig: {
            defaultModelsExpandDepth: -1,
            operationsSorter: 'alpha',
            // tagsSorter: 'alpha',
            syntaxHighlight: {
                activate: true,
                theme: 'arta'
            },
            tryItOutEnabled: false,
            supportedSubmitMethods: [''],
            validatorUrl: null
        }
    }

    // Fully built path
    let logoPath = path.join(__dirname, '../../frontend/dist/ff-logo--wordmark-caps--dark.png')
    if (!existsSync(logoPath)) {
        // Local dev mode, not yet built
        logoPath = path.join(__dirname, '../../frontend/src/images/ff-logo--wordmark-caps--dark.png')
    }
    if (existsSync(logoPath)) {
        // Only set a logo if we found it
        swaggerUIOptions.logo = {
            type: 'image/png',
            content: readFileSync(logoPath)
        }
    }
    // Fully built path
    let faviconPath = path.join(__dirname, '../../frontend/dist/favicon-32x32.png')
    if (!existsSync(faviconPath)) {
        // Local dev mode, not yet built
        faviconPath = path.join(__dirname, '../../frontend/public/favicon-32x32.png')
    }
    if (existsSync(faviconPath)) {
        // Only set a favicon if we found it
        swaggerUIOptions.theme.favicon = [
            {
                filename: 'favicon.png',
                rel: 'icon',
                sizes: '32x32',
                type: 'image/png',
                content: readFileSync(faviconPath)
            }
        ]
    }

    await app.register(require('@fastify/swagger-ui'), swaggerUIOptions)

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
