const fp = require('fastify-plugin')
const { Roles } = require('../../../lib/roles.js')
const { registerPermissions } = require('../../../lib/permissions')

module.exports = fp(async function (app, opts, done) {
    registerPermissions({
        'saml-provider:create': { description: 'Create a SAML Provider', role: Roles.Admin },
        'saml-provider:list': { description: 'List all SAML Providers', role: Roles.Admin },
        'saml-provider:read': { description: 'View a SAML Provider', role: Roles.Admin },
        'saml-provider:delete': { description: 'Delete a SAML Provider', role: Roles.Admin },
        'saml-provider:edit': { description: 'Edit a SAML Provider', role: Roles.Admin }
    })

    // Get all
    app.get('/sso/providers', {
        preHandler: app.needsPermission('saml-provider:list')
    }, async (request, reply) => {
        const providers = await app.db.models.SAMLProvider.getAll()
        providers.providers = providers.providers.map(u => app.db.views.SAMLProvider.provider(u))
        reply.send(providers)
    })

    // Get
    app.get('/sso/providers/:providerId', {
        preHandler: app.needsPermission('saml-provider:read')
    }, async (request, reply) => {
        const provider = await app.db.models.SAMLProvider.byId(request.params.providerId)
        if (provider) {
            reply.send(app.db.views.SAMLProvider.provider(provider))
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    // Create
    app.post('/sso/providers', {
        preHandler: app.needsPermission('saml-provider:create')
    }, async (request, reply) => {
        const opts = {
            name: request.body.name,
            domainFilter: request.body.domainFilter,
            active: false,
            options: {}
        }
        const provider = await app.db.models.SAMLProvider.create(opts)
        reply.send(app.db.views.SAMLProvider.provider(provider))
    })

    // Delete
    app.delete('/sso/providers/:providerId', {
        preHandler: app.needsPermission('saml-provider:delete')
    }, async (request, reply) => {
        const provider = await app.db.models.SAMLProvider.byId(request.params.providerId)
        if (provider) {
            await provider.destroy()
            reply.send({ status: 'okay' })
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    // Update
    app.put('/sso/providers/:providerId', {
        preHandler: app.needsPermission('saml-provider:edit')
    }, async (request, reply) => {
        const provider = await app.db.models.SAMLProvider.byId(request.params.providerId)
        if (provider) {
            if (request.body.name !== undefined) {
                provider.name = request.body.name
            }
            if (request.body.domainFilter !== undefined) {
                provider.domainFilter = request.body.domainFilter
            }
            if (request.body.active !== undefined) {
                provider.active = request.body.active
            }
            if (request.body.options !== undefined) {
                provider.options = request.body.options
            }
            await provider.save()

            const updatedProvider = await app.db.models.SAMLProvider.byId(request.params.providerId)
            reply.send(app.db.views.SAMLProvider.provider(updatedProvider))
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    // IMPORTANT: register the auth routes last so that none of their internal
    // handling get applied to the routes registered in this file.
    await app.register(require('./auth'))

    done()
})
