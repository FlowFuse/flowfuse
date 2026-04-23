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
module.exports = fp(async function (app, opts) {
    app.decorate('getPaginationOptions', (request, defaults) => {
        const result = { ...defaults, ...request.query }
        if (result.query) {
            result.query = result.query.trim()
        }
        return result
    })

    await app.register(require('./api-docs'))

    // Response Validation: dev only — surfaces schema/view drift as 500s.
    if (process.env.NODE_ENV === 'development') {
        const Ajv = require('ajv')
        const ajv = new Ajv({
            coerceTypes: false,
            useDefaults: true,
            // removeAdditional off: mutates the working copy during allOf validation, breaking outer `required` checks.
            removeAdditional: false,
            allErrors: true,
            strict: false
        })
        // Convert OpenAPI `nullable: true` to JSON Schema — Ajv doesn't understand the keyword.
        const stripNullable = (value) => {
            if (Array.isArray(value)) return value.map(stripNullable)
            if (value && typeof value === 'object') {
                const { nullable, ...rest } = value
                const converted = {}
                for (const [k, v] of Object.entries(rest)) {
                    converted[k] = stripNullable(v)
                }
                if (nullable === true) {
                    return { anyOf: [converted, { type: 'null' }] }
                }
                return converted
            }
            return value
        }
        // preSerialization hands us Date/Sequelize instances; validate the wire shape.
        const originalCompile = ajv.compile.bind(ajv)
        ajv.compile = (schema, _meta) => {
            const validate = originalCompile(stripNullable(schema), _meta)
            const wrapped = (data) => {
                const wireShape = JSON.parse(JSON.stringify(data))
                const result = validate(wireShape)
                wrapped.errors = validate.errors
                return result
            }
            return wrapped
        }
        // Populate ajv before @fastify/response-validation compiles — hooks fire in registration order.
        app.addHook('onRoute', function syncSchemasToAjv () {
            const schemas = this.getSchemas()
            for (const id of Object.keys(schemas)) {
                if (!ajv.getSchema(id)) {
                    ajv.addSchema(stripNullable(schemas[id]), id)
                }
            }
        })
        await app.register(require('@fastify/response-validation'), { ajv })
    }

    await app.register(require('@fastify/websocket'))
    await app.register(require('./auth'), { logLevel: app.config.logging.http })
    await app.register(require('./api'), { prefix: '/api/v1', logLevel: app.config.logging.http })
    await app.register(require('./ui'), { logLevel: app.config.logging.http })
    await app.register(require('./setup'), { logLevel: app.config.logging.http })
    await app.register(require('./storage'), { prefix: '/storage', logLevel: app.config.logging.http })
    await app.register(require('./logging'), { prefix: '/logging', logLevel: app.config.logging.http })
}, { name: 'app.routes' })
