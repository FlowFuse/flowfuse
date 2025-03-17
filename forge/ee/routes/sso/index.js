const fp = require('fastify-plugin')

const { Client, InvalidCredentialsError } = require('ldapts')

module.exports = fp(async function (app, opts) {
    // Get all
    app.get('/ee/sso/providers', {
        preHandler: app.needsPermission('saml-provider:list')
    }, async (request, reply) => {
        const providers = await app.db.models.SAMLProvider.getAll()
        providers.providers = providers.providers.map(u => app.db.views.SAMLProvider.providerSummary(u))
        reply.send(providers)
    })

    // Get
    app.get('/ee/sso/providers/:providerId', {
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
    app.post('/ee/sso/providers', {
        preHandler: app.needsPermission('saml-provider:create')
    }, async (request, reply) => {
        const opts = {
            name: request.body.name,
            domainFilter: request.body.domainFilter,
            active: false,
            type: request.body.type || 'saml',
            options: {}
        }
        const provider = await app.db.models.SAMLProvider.create(opts)
        reply.send(app.db.views.SAMLProvider.provider(provider))
    })

    // Delete
    app.delete('/ee/sso/providers/:providerId', {
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
    app.put('/ee/sso/providers/:providerId', {
        preHandler: app.needsPermission('saml-provider:edit')
    }, async (request, reply) => {
        const provider = await app.db.models.SAMLProvider.byId(request.params.providerId)
        if (provider) {
            // Does not allow 'type' to be modified
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
                const existingLDAPPassword = provider.options.password
                const newOptions = { ...request.body.options }
                if (newOptions.password === '__PLACEHOLDER__') {
                    // We have received an unmodified placeholder password value
                    // This means it hasn't been changed in the UI, so we should
                    // preserve the existing value
                    newOptions.password = existingLDAPPassword
                }
                provider.options = newOptions
            }
            await provider.save()

            const updatedProvider = await app.db.models.SAMLProvider.byId(request.params.providerId)
            reply.send(app.db.views.SAMLProvider.provider(updatedProvider))
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    /**
     * Test SSO creds, LDAP only at first
     */
    app.post('/ee/sso/providers/test', {
        preHandler: app.needsPermission('saml-provider:edit')
    }, async (request, reply) => {
        let url = request.body.options.server
        if (!/^ldaps?:\/\//.test(url)) {
            if (request.body.options.tls) {
                url = 'ldaps://' + url
            } else {
                url = 'ldap://' + url
            }
        }

        const clientOptions = { url }
        if (request.body.options.tls) {
            if (!request.body.options.tlsVerifyServer) {
                clientOptions.tlsOptions = {
                    rejectUnauthorized: false
                }
            }
        }

        if (request.body.options.password === '__PLACEHOLDER__' && request.body.id) {
            const provider = await app.db.models.SAMLProvider.byId(request.body.id)
            request.body.options.password = provider.getOptions().password
        }

        let adminClient
        try {
            adminClient = new Client(clientOptions)
            await adminClient.bind(request.body.options.username, request.body.options.password)
            reply.send({})
        } catch (err) {
            const response = {}
            if (err instanceof InvalidCredentialsError) {
                response.code = 'incorrect_credentials'
                response.error = 'Incorrect Credentials'
            } else if (err.code === 'ECONNREFUSED') {
                response.code = 'connection_refused'
                response.error = 'Connection Refused'
            } else if (err.code === 'ERR_INVALID_URL') {
                response.code = 'invalid_url'
                response.error = `${err.input} not valid LDAP URL`
            } else {
                response.code = 'unexpected_error'
                response.error = err.toString()
            }
            reply.code(400).send(response)
        } finally {
            try {
                if (adminClient) {
                    await adminClient.unbind()
                }
            } catch (err) {}
        }
    })

    // IMPORTANT: register the auth routes last so that none of their internal
    // handling get applied to the routes registered in this file.
    await app.register(require('./auth'))
}, { name: 'app.ee.routes.sso' })
