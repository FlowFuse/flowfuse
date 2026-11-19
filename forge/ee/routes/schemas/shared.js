const { SchemaDocumentError } = require('../../lib/schemas/document')

/**
 * Turn a known error from a schema route into its response. Anything else is rethrown.
 */
function sendError (reply, err) {
    if (err instanceof SchemaDocumentError) {
        return reply.status(400).send({ code: err.code, error: err.message, path: err.path })
    }
    if (err.name === 'SequelizeUniqueConstraintError') {
        return reply.status(409).send({ code: 'name_conflict', error: 'The name is already in use in this team' })
    }
    if (err.name === 'SequelizeValidationError') {
        return reply.status(400).send({ code: 'invalid_request', error: err.errors.map(e => e.message).join(', ') })
    }
    throw err
}

/**
 * Find a group in the team from its id in a request body.
 * @returns {Promise<number | null | undefined>} the group's database id, `null` for no group, `undefined` when not in the team
 */
async function resolveGroupId (app, team, groupId) {
    if (groupId === null) {
        return null
    }
    const group = await app.db.models.DataSchemaGroup.byId(groupId)
    if (!group || group.TeamId !== team.id) {
        return undefined
    }
    return group.id
}

const invalidGroup = { code: 'invalid_group', error: 'The schema group does not exist in this team' }

module.exports = {
    sendError,
    resolveGroupId,
    invalidGroup
}
