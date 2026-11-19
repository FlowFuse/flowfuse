const { diffSchemas } = require('../../../lib/schemas/diff')
const { MAX_PAYLOAD_BYTES, validatePayload } = require('../../lib/schemas/document')

const { sendError } = require('./shared')

/**
 * Published and deprecated versions of a data schema, validating payloads and comparing versions.
 * The draft has its own routes, apart from validating against it.
 *
 * All routes are relative to /api/v1/teams/:teamId/schemas
 * @memberof forge.routes.api.team.schemas
 */
module.exports = async function (app) {
    const schemaParams = {
        type: 'object',
        properties: {
            teamId: { type: 'string' },
            schemaId: { type: 'string' }
        }
    }
    const versionParams = {
        type: 'object',
        properties: {
            teamId: { type: 'string' },
            schemaId: { type: 'string' },
            version: { type: 'string', description: 'An exact version, or `latest` for the newest published version' }
        }
    }
    const errors = {
        '4xx': { $ref: 'APIError' },
        500: { $ref: 'APIError' }
    }
    const validateBody = {
        type: 'object',
        properties: {
            payload: { description: 'Any JSON value' }
        },
        required: ['payload']
    }
    const validateResponse = {
        type: 'object',
        properties: {
            valid: { type: 'boolean' },
            errors: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        path: { type: 'string' },
                        keyword: { type: 'string' },
                        message: { type: 'string' },
                        params: { type: 'object', additionalProperties: true }
                    },
                    required: ['path', 'keyword', 'message', 'params']
                }
            }
        },
        required: ['valid', 'errors']
    }
    // Room for a payload at the limit plus the request wrapper, so the limit is reported as a 400
    const validateBodyLimit = MAX_PAYLOAD_BYTES + 64 * 1024

    const unknownVersion = (version) => ({ code: 'not_found', error: `Version ${version} not found` })

    function validate (reply, document, payload) {
        try {
            return reply.send(validatePayload(document, payload))
        } catch (err) {
            return sendError(reply, err)
        }
    }

    app.get('/:schemaId/versions', {
        preHandler: app.needsPermission('team:schema:list'),
        schema: {
            summary: 'List the published and deprecated versions of a data schema, newest first',
            tags: ['Data Schemas'],
            params: schemaParams,
            querystring: {
                type: 'object',
                properties: {
                    status: { type: 'string', enum: ['published', 'deprecated'] }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        count: { type: 'number' },
                        versions: { type: 'array', items: { $ref: 'DataSchemaVersionSummary' } }
                    },
                    required: ['count', 'versions']
                },
                ...errors
            }
        }
    }, async (request, reply) => {
        const versions = (await app.db.models.DataSchemaVersion.forSchema(request.dataSchema.id, { status: request.query.status }))
            .filter(version => version.status !== 'draft')
        reply.send({ count: versions.length, versions: versions.map(app.db.views.DataSchemaVersion.versionSummary) })
    })

    app.get('/:schemaId/versions/:version', {
        preHandler: app.needsPermission('team:schema:list'),
        schema: {
            summary: 'Get a published or deprecated version of a data schema',
            tags: ['Data Schemas'],
            params: versionParams,
            response: {
                200: { $ref: 'DataSchemaVersion' },
                ...errors
            }
        }
    }, async (request, reply) => {
        const version = await app.db.models.DataSchemaVersion.byVersion(request.dataSchema.id, request.params.version)
        if (!version) {
            return reply.status(404).send(unknownVersion(request.params.version))
        }
        reply.send(app.db.views.DataSchemaVersion.version(version))
    })

    app.post('/:schemaId/versions/:version/deprecate', {
        preHandler: app.needsPermission('team:schema:deprecate'),
        schema: {
            summary: 'Deprecate a published version; flows using it keep working',
            tags: ['Data Schemas'],
            params: versionParams,
            response: {
                200: { $ref: 'DataSchemaVersion' },
                ...errors
            }
        }
    }, async (request, reply) => {
        const version = await app.db.models.DataSchemaVersion.byVersion(request.dataSchema.id, request.params.version)
        if (!version) {
            return reply.status(404).send(unknownVersion(request.params.version))
        }
        if (version.status === 'deprecated') {
            return reply.status(409).send({ code: 'already_deprecated', error: `Version ${version.version} is already deprecated` })
        }
        await version.update({ status: 'deprecated' })
        await app.auditLog.Team.schemas.version.deprecated(request.session.User, null, request.team, request.dataSchema, version)
        reply.send(app.db.views.DataSchemaVersion.version(version))
    })

    app.post('/:schemaId/versions/:version/undeprecate', {
        preHandler: app.needsPermission('team:schema:deprecate'),
        schema: {
            summary: 'Undeprecate a deprecated version, so it is published again',
            tags: ['Data Schemas'],
            params: versionParams,
            response: {
                200: { $ref: 'DataSchemaVersion' },
                ...errors
            }
        }
    }, async (request, reply) => {
        const version = await app.db.models.DataSchemaVersion.byVersion(request.dataSchema.id, request.params.version)
        if (!version) {
            return reply.status(404).send(unknownVersion(request.params.version))
        }
        if (version.status !== 'deprecated') {
            return reply.status(409).send({ code: 'not_deprecated', error: `Version ${version.version} is not deprecated` })
        }
        await version.update({ status: 'published' })
        await app.auditLog.Team.schemas.version.undeprecated(request.session.User, null, request.team, request.dataSchema, version)
        reply.send(app.db.views.DataSchemaVersion.version(version))
    })

    app.post('/:schemaId/versions/:version/validate', {
        preHandler: app.needsPermission('team:schema:list'),
        bodyLimit: validateBodyLimit,
        schema: {
            summary: 'Check a payload against a version; nothing is stored',
            tags: ['Data Schemas'],
            params: versionParams,
            body: validateBody,
            response: {
                200: validateResponse,
                ...errors
            }
        }
    }, async (request, reply) => {
        const version = await app.db.models.DataSchemaVersion.byVersion(request.dataSchema.id, request.params.version)
        if (!version) {
            return reply.status(404).send(unknownVersion(request.params.version))
        }
        return validate(reply, version.schema, request.body.payload)
    })

    app.post('/:schemaId/draft/validate', {
        preHandler: app.needsPermission('team:schema:list'),
        bodyLimit: validateBodyLimit,
        schema: {
            summary: 'Check a payload against the draft; nothing is stored',
            tags: ['Data Schemas'],
            params: schemaParams,
            body: validateBody,
            response: {
                200: validateResponse,
                ...errors
            }
        }
    }, async (request, reply) => {
        const draft = await app.db.models.DataSchemaVersion.draftFor(request.dataSchema.id)
        if (!draft) {
            return reply.status(404).send({ code: 'not_found', error: 'This schema has no draft' })
        }
        return validate(reply, draft.schema, request.body.payload)
    })

    app.get('/:schemaId/diff', {
        preHandler: app.needsPermission('team:schema:list'),
        schema: {
            summary: 'List what was added, changed or deleted between two versions, or a version and the draft',
            tags: ['Data Schemas'],
            params: schemaParams,
            querystring: {
                type: 'object',
                properties: {
                    from: { type: 'string', description: 'An exact version or `latest`' },
                    to: { type: 'string', description: 'An exact version, `latest` or `draft`' }
                },
                required: ['from', 'to']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        from: { type: 'string' },
                        to: { type: 'string' },
                        changes: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    path: { type: 'string' },
                                    type: { type: 'string', enum: ['added', 'changed', 'deleted'] },
                                    detail: {
                                        type: 'object',
                                        properties: {
                                            from: {},
                                            to: {}
                                        }
                                    }
                                },
                                required: ['path', 'type', 'detail']
                            }
                        }
                    },
                    required: ['from', 'to', 'changes']
                },
                ...errors
            }
        }
    }, async (request, reply) => {
        const schemaId = request.dataSchema.id
        const from = await app.db.models.DataSchemaVersion.byVersion(schemaId, request.query.from)
        if (!from) {
            return reply.status(404).send(unknownVersion(request.query.from))
        }
        const to = request.query.to === 'draft'
            ? await app.db.models.DataSchemaVersion.draftFor(schemaId)
            : await app.db.models.DataSchemaVersion.byVersion(schemaId, request.query.to)
        if (!to) {
            return reply.status(404).send(request.query.to === 'draft' ? { code: 'not_found', error: 'This schema has no draft' } : unknownVersion(request.query.to))
        }
        reply.send({
            from: from.version,
            to: to.version ?? 'draft',
            changes: diffSchemas(from.schema, to.schema)
        })
    })
}
