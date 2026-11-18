const { checkNewVersion } = require('../../../lib/schemas/version')
const { checkDocument, removeId, setId } = require('../../lib/schemas/document')

const { sendError, EMPTY_SCHEMA } = require('./shared')

/**
 * The draft of a data schema and publishing it. A schema has at most one draft, and the draft has no version number.
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
    const errors = {
        '4xx': { $ref: 'APIError' },
        500: { $ref: 'APIError' }
    }
    const noDraft = { code: 'not_found', error: 'This schema has no draft' }
    const noPublishableDraft = { code: 'not_found', error: 'This schema has no draft to publish' }
    const versionExists = (version) => ({ code: 'version_exists', error: `Version ${version} already exists` })

    function draftView (draft) {
        return app.db.views.DataSchemaVersion.draft(draft, checkDocument(draft.schema).problems)
    }

    app.get('/:schemaId/draft', {
        preHandler: app.needsPermission('team:schema:list'),
        schema: {
            summary: 'Get the draft of a data schema with its problems',
            tags: ['Data Schemas'],
            params: schemaParams,
            response: {
                200: { $ref: 'DataSchemaDraft' },
                ...errors
            }
        }
    }, async (request, reply) => {
        const draft = await app.db.models.DataSchemaVersion.draftFor(request.dataSchema.id)
        if (!draft) {
            return reply.status(404).send(noDraft)
        }
        reply.send(draftView(draft))
    })

    app.post('/:schemaId/draft', {
        preHandler: app.needsPermission('team:schema:edit'),
        schema: {
            summary: 'Start a draft, from a version or from a document',
            tags: ['Data Schemas'],
            params: schemaParams,
            body: {
                type: 'object',
                properties: {
                    from: { type: 'string', description: 'The version to copy, or `latest`; defaults to the latest published version' },
                    schema: { description: 'The document for the draft; used instead of copying a version' },
                    notes: { type: 'string' }
                }
            },
            response: {
                200: { $ref: 'DataSchemaDraft' },
                ...errors
            }
        }
    }, async (request, reply) => {
        const schema = request.dataSchema
        const body = request.body || {}
        let document = body.schema
        if (document === undefined) {
            const source = await app.db.models.DataSchemaVersion.byVersion(schema.id, body.from ?? 'latest')
            if (!source && body.from !== undefined) {
                return reply.status(400).send({ code: 'unknown_version', error: `Version ${body.from} does not exist` })
            }
            document = source ? source.schema : EMPTY_SCHEMA
        }
        try {
            checkDocument(document)
            await app.db.models.DataSchemaVersion.create({
                DataSchemaId: schema.id,
                schema: removeId(document),
                notes: body.notes,
                CreatedById: request.session.User?.id ?? null
            })
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                return reply.status(409).send({ code: 'draft_exists', error: 'This schema already has a draft' })
            }
            return sendError(reply, err)
        }
        await app.auditLog.Team.schemas.draft.created(request.session.User, null, request.team, schema)
        reply.send(draftView(await app.db.models.DataSchemaVersion.draftFor(schema.id)))
    })

    app.put('/:schemaId/draft', {
        preHandler: app.needsPermission('team:schema:edit'),
        schema: {
            summary: 'Save the draft; it is saved even when it has problems',
            tags: ['Data Schemas'],
            params: schemaParams,
            body: {
                type: 'object',
                properties: {
                    schema: { description: 'The JSON Schema 2020-12 document' },
                    notes: { type: 'string' }
                }
            },
            response: {
                200: { $ref: 'DataSchemaDraft' },
                ...errors
            }
        }
    }, async (request, reply) => {
        const draft = await app.db.models.DataSchemaVersion.draftFor(request.dataSchema.id)
        if (!draft) {
            return reply.status(404).send(noDraft)
        }
        const body = request.body || {}
        try {
            if (body.schema !== undefined) {
                checkDocument(body.schema)
                draft.schema = removeId(body.schema)
            }
            if (body.notes !== undefined) {
                draft.notes = body.notes
            }
            await draft.save()
        } catch (err) {
            return sendError(reply, err)
        }
        reply.send(draftView(draft))
    })

    app.delete('/:schemaId/draft', {
        preHandler: app.needsPermission('team:schema:edit'),
        schema: {
            summary: 'Discard the draft',
            tags: ['Data Schemas'],
            params: schemaParams,
            response: {
                200: { $ref: 'APIStatus' },
                ...errors
            }
        }
    }, async (request, reply) => {
        const draft = await app.db.models.DataSchemaVersion.draftFor(request.dataSchema.id)
        if (!draft) {
            return reply.status(404).send(noDraft)
        }
        await draft.destroy()
        await app.auditLog.Team.schemas.draft.discarded(request.session.User, null, request.team, request.dataSchema)
        reply.send({ status: 'okay' })
    })

    app.post('/:schemaId/draft/publish', {
        preHandler: app.needsPermission('team:schema:publish'),
        schema: {
            summary: 'Publish the draft with the version given by the caller',
            tags: ['Data Schemas'],
            params: schemaParams,
            body: {
                type: 'object',
                properties: {
                    version: { type: 'string', description: 'A plain major.minor.patch version, higher than every existing version' },
                    notes: { type: 'string' }
                },
                required: ['version']
            },
            response: {
                200: { $ref: 'DataSchemaVersion' },
                ...errors
            }
        }
    }, async (request, reply) => {
        const schema = request.dataSchema
        const { version, notes } = request.body
        const draft = await app.db.models.DataSchemaVersion.draftFor(schema.id)
        if (!draft) {
            return reply.status(404).send(noPublishableDraft)
        }
        const existing = await app.db.models.DataSchemaVersion.existingVersions(schema.id)
        const versionProblem = checkNewVersion(version, existing)
        if (versionProblem?.code === 'invalid_version') {
            return reply.status(400).send({ code: 'invalid_version', error: 'The version must be a plain major.minor.patch version such as 1.2.0' })
        }
        if (versionProblem?.code === 'version_exists') {
            return reply.status(409).send(versionExists(version))
        }
        if (versionProblem?.code === 'version_not_higher') {
            return reply.status(409).send({ code: 'version_not_higher', error: `The version must be higher than ${versionProblem.highest}`, highest: versionProblem.highest })
        }
        let problems
        try {
            problems = checkDocument(draft.schema).problems
        } catch (err) {
            return sendError(reply, err)
        }
        if (problems.length > 0) {
            return reply.status(400).send({ code: 'schema_has_problems', error: 'The draft has problems and cannot be published', problems })
        }
        try {
            const published = await app.db.models.DataSchemaVersion.publishDraft(draft.id, {
                version,
                schema: setId(draft.schema, schema.hashid, version),
                notes: notes ?? draft.notes,
                publishedById: request.session.User?.id ?? null
            })
            if (!published) {
                // Another request published this draft first
                return reply.status(404).send(noPublishableDraft)
            }
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                return reply.status(409).send(versionExists(version))
            }
            throw err
        }
        const published = await app.db.models.DataSchemaVersion.byVersion(schema.id, version)
        await app.auditLog.Team.schemas.version.published(request.session.User, null, request.team, schema, published)
        reply.send(app.db.views.DataSchemaVersion.version(published))
    })
}
