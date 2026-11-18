const { checkDocument, removeId } = require('../../lib/schemas/document')

const { sendError, resolveGroupId, invalidGroup } = require('./shared')

// The document a new schema's draft starts from when none is given
const EMPTY_SCHEMA = { type: 'object', properties: {} }

/**
 * Data schemas
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

    async function schemaView (schema) {
        const loaded = await app.db.models.DataSchema.byId(schema.id)
        const versions = await app.db.models.DataSchemaVersion.forSchema(schema.id)
        return app.db.views.DataSchema.schema(loaded, versions)
    }

    app.get('/', {
        preHandler: app.needsPermission('team:schema:list'),
        schema: {
            summary: 'List the data schemas in a team',
            tags: ['Data Schemas'],
            querystring: {
                type: 'object',
                properties: {
                    cursor: { type: 'string' },
                    limit: { type: 'number' },
                    query: { type: 'string' },
                    name: { type: 'string', description: 'Exact schema name' },
                    groupId: { type: 'string', description: 'A group id, or `none` for schemas without a group' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        schemas: { type: 'array', items: { $ref: 'DataSchemaSummary' } }
                    },
                    required: ['meta', 'count', 'schemas']
                },
                ...errors
            }
        }
    }, async (request, reply) => {
        const { name, groupId, ...pagination } = request.query
        if (name !== undefined) {
            const schema = await app.db.models.DataSchema.byName(request.team.id, name)
            const schemas = schema ? [app.db.views.DataSchema.schemaSummary(schema)] : []
            return reply.send({ meta: {}, count: schemas.length, schemas })
        }
        const filter = {}
        if (groupId === 'none') {
            filter.groupId = null
        } else if (groupId !== undefined) {
            filter.groupId = await resolveGroupId(app, request.team, groupId)
            if (filter.groupId === undefined) {
                return reply.status(400).send(invalidGroup)
            }
        }
        try {
            const result = await app.db.models.DataSchema.forTeam(request.team.id, pagination, filter)
            reply.send({
                meta: result.meta,
                count: result.count,
                schemas: result.schemas.map(app.db.views.DataSchema.schemaSummary)
            })
        } catch (err) {
            if (err.code === 'invalid_cursor') {
                return reply.status(400).send({ code: err.code, error: err.message })
            }
            throw err
        }
    })

    app.post('/', {
        preHandler: app.needsPermission('team:schema:create'),
        schema: {
            summary: 'Create a data schema with its draft',
            tags: ['Data Schemas'],
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    groupId: { type: 'string', nullable: true },
                    schema: { description: 'The JSON Schema 2020-12 document for the draft; defaults to an empty object schema' },
                    notes: { type: 'string' }
                },
                required: ['name']
            },
            response: {
                200: { $ref: 'DataSchema' },
                ...errors
            }
        }
    }, async (request, reply) => {
        let groupId = null
        if (request.body.groupId !== undefined) {
            groupId = await resolveGroupId(app, request.team, request.body.groupId)
            if (groupId === undefined) {
                return reply.status(400).send(invalidGroup)
            }
        }
        const document = request.body.schema === undefined ? EMPTY_SCHEMA : request.body.schema
        let schema
        try {
            // Rejects references and documents over the limits; other problems are saved with the draft
            checkDocument(document)
            schema = await app.db.sequelize.transaction(async (transaction) => {
                const created = await app.db.models.DataSchema.create({
                    name: request.body.name,
                    description: request.body.description,
                    TeamId: request.team.id,
                    DataSchemaGroupId: groupId
                }, { transaction })
                await app.db.models.DataSchemaVersion.create({
                    DataSchemaId: created.id,
                    schema: removeId(document),
                    notes: request.body.notes,
                    CreatedById: request.session.User?.id ?? null
                }, { transaction })
                return created
            })
        } catch (err) {
            return sendError(reply, err)
        }
        await app.auditLog.Team.schemas.schema.created(request.session.User, null, request.team, schema)
        reply.send(await schemaView(schema))
    })

    app.get('/:schemaId', {
        preHandler: app.needsPermission('team:schema:list'),
        schema: {
            summary: 'Get a data schema with its version list',
            tags: ['Data Schemas'],
            params: schemaParams,
            response: {
                200: { $ref: 'DataSchema' },
                ...errors
            }
        }
    }, async (request, reply) => {
        reply.send(await schemaView(request.dataSchema))
    })

    app.put('/:schemaId', {
        preHandler: app.needsPermission('team:schema:edit'),
        schema: {
            summary: 'Rename a data schema, edit its description or move it to another group',
            tags: ['Data Schemas'],
            params: schemaParams,
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    groupId: { type: 'string', nullable: true, description: 'A group id, or null to remove the schema from its group' }
                }
            },
            response: {
                200: { $ref: 'DataSchema' },
                ...errors
            }
        }
    }, async (request, reply) => {
        const schema = request.dataSchema
        const before = {
            name: schema.name,
            description: schema.description ?? '',
            group: schema.DataSchemaGroup?.name ?? null
        }
        if (request.body.groupId !== undefined) {
            const groupId = await resolveGroupId(app, request.team, request.body.groupId)
            if (groupId === undefined) {
                return reply.status(400).send(invalidGroup)
            }
            schema.DataSchemaGroupId = groupId
        }
        if (request.body.name !== undefined) {
            schema.name = request.body.name
        }
        if (request.body.description !== undefined) {
            schema.description = request.body.description
        }
        try {
            await schema.save()
        } catch (err) {
            return sendError(reply, err)
        }
        const updated = await app.db.models.DataSchema.byId(schema.id)
        const updates = new app.auditLog.formatters.UpdatesCollection()
        updates.pushDifferences(before, {
            name: updated.name,
            description: updated.description ?? '',
            group: updated.DataSchemaGroup?.name ?? null
        })
        if (updates.length > 0) {
            await app.auditLog.Team.schemas.schema.updated(request.session.User, null, request.team, updated, updates)
        }
        reply.send(await schemaView(updated))
    })

    app.delete('/:schemaId', {
        preHandler: app.needsPermission('team:schema:delete'),
        schema: {
            summary: 'Delete a data schema and all its versions',
            tags: ['Data Schemas'],
            params: schemaParams,
            response: {
                200: { $ref: 'APIStatus' },
                ...errors
            }
        }
    }, async (request, reply) => {
        const schema = request.dataSchema
        await schema.destroy()
        await app.auditLog.Team.schemas.schema.deleted(request.session.User, null, request.team, schema)
        reply.send({ status: 'okay' })
    })
}
