// Every test boots many app instances, and each one compiles the same route
// schemas from scratch. Share compiled validators and serializers between the
// instances in a process, keyed on the schema and compiler options.
const { createHash } = require('crypto')
const path = require('path')

// Use the compilers fastify itself depends on, so behaviour matches the default
const fastifyPath = require.resolve('fastify')
const fromFastify = name => require(require.resolve(name, { paths: [path.dirname(fastifyPath)] }))
const AjvCompiler = fromFastify('@fastify/ajv-compiler')
const SerializerCompiler = fromFastify('@fastify/fast-json-stringify-compiler')

const hash = value => createHash('sha1').update(JSON.stringify(value) ?? 'undefined').digest('hex')

function cachedFactory (baseFactory, kind) {
    const cache = new Map()
    return function (externalSchemas, options) {
        const compile = baseFactory(externalSchemas, options)
        const prefix = kind + hash(externalSchemas) + hash(options)
        return function (routeOptions) {
            const key = prefix + hash(routeOptions.schema) + (routeOptions.httpPart || '') + (routeOptions.httpStatus || '') + (routeOptions.contentType || '')
            let fn = cache.get(key)
            if (!fn) {
                fn = compile(routeOptions)
                cache.set(key, fn)
            }
            return fn
        }
    }
}

const compilersFactory = {
    buildValidator: cachedFactory(AjvCompiler(), 'v'),
    buildSerializer: cachedFactory(SerializerCompiler(), 's')
}

const fastify = require(fastifyPath)
function fastifyWithSchemaCache (options = {}) {
    return fastify({
        ...options,
        schemaController: { ...options.schemaController, compilersFactory }
    })
}
Object.assign(fastifyWithSchemaCache, fastify)
fastifyWithSchemaCache.default = fastifyWithSchemaCache
fastifyWithSchemaCache.fastify = fastifyWithSchemaCache
require.cache[fastifyPath].exports = fastifyWithSchemaCache
