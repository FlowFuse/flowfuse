const { sendError } = require('./shared')

/**
 * Schema groups
 *
 * All routes are relative to /api/v1/teams/:teamId/schemas/groups
 * @memberof forge.routes.api.team.schemas
 */
module.exports = async function (app) {
    const groupBody = {
        type: 'object',
        properties: {
            name: { type: 'string' }
        },
        required: ['name']
    }
    const groupParams = {
        type: 'object',
        properties: {
            teamId: { type: 'string' },
            groupId: { type: 'string' }
        }
    }
    const errors = {
        '4xx': { $ref: 'APIError' },
        500: { $ref: 'APIError' }
    }

    app.get('/', {
        preHandler: app.needsPermission('team:schema:list'),
        schema: {
            summary: 'List the schema groups in a team, sorted by name',
            tags: ['Data Schemas'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        count: { type: 'number' },
                        groups: { type: 'array', items: { $ref: 'DataSchemaGroup' } }
                    },
                    required: ['count', 'groups']
                },
                ...errors
            }
        }
    }, async (request, reply) => {
        const groups = await app.db.models.DataSchemaGroup.forTeam(request.team.id)
        reply.send({ count: groups.length, groups: groups.map(app.db.views.DataSchemaGroup.group) })
    })

    app.post('/', {
        preHandler: app.needsPermission('team:schema:create'),
        schema: {
            summary: 'Create a schema group',
            tags: ['Data Schemas'],
            body: groupBody,
            response: {
                200: { $ref: 'DataSchemaGroup' },
                ...errors
            }
        }
    }, async (request, reply) => {
        try {
            const created = await app.db.models.DataSchemaGroup.create({ name: request.body.name, TeamId: request.team.id })
            const group = await app.db.models.DataSchemaGroup.byId(created.id)
            await app.auditLog.Team.schemas.group.created(request.session.User, null, request.team, group)
            reply.send(app.db.views.DataSchemaGroup.group(group))
        } catch (err) {
            return sendError(reply, err)
        }
    })

    app.put('/:groupId', {
        preHandler: app.needsPermission('team:schema:edit'),
        schema: {
            summary: 'Rename a schema group',
            tags: ['Data Schemas'],
            params: groupParams,
            body: groupBody,
            response: {
                200: { $ref: 'DataSchemaGroup' },
                ...errors
            }
        }
    }, async (request, reply) => {
        const group = request.dataSchemaGroup
        const before = { name: group.name }
        try {
            group.name = request.body.name
            await group.save()
        } catch (err) {
            return sendError(reply, err)
        }
        const updates = new app.auditLog.formatters.UpdatesCollection()
        updates.pushDifferences(before, { name: group.name })
        if (updates.length > 0) {
            await app.auditLog.Team.schemas.group.updated(request.session.User, null, request.team, group, updates)
        }
        reply.send(app.db.views.DataSchemaGroup.group(group))
    })

    app.delete('/:groupId', {
        preHandler: app.needsPermission('team:schema:delete'),
        schema: {
            summary: 'Delete a schema group; its schemas are kept, without a group',
            tags: ['Data Schemas'],
            params: groupParams,
            response: {
                200: { $ref: 'APIStatus' },
                ...errors
            }
        }
    }, async (request, reply) => {
        const group = request.dataSchemaGroup
        await group.destroy()
        await app.auditLog.Team.schemas.group.deleted(request.session.User, null, request.team, group)
        reply.send({ status: 'okay' })
    })
}
