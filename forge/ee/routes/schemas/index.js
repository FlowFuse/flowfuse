/**
 * Team data schema registry
 *
 * All routes are relative to /api/v1/teams/:teamId/schemas
 * @namespace schemas
 * @memberof forge.routes.api.team
 */
module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
        if (!request.team) {
            request.team = await app.db.models.Team.byId(request.params.teamId)
            if (!request.team) {
                return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
        await request.team.ensureTeamTypeExists()
        if (!request.team.getFeatureProperty('schemas', false)) {
            return reply.status(404).send({ code: 'not_found', error: 'Not Found - Data schemas are not enabled for this team' })
        }
        if (!request.teamMembership && request.session?.User) {
            request.teamMembership = await request.session.User.getTeamMembership(request.team.id)
        }
        if (request.params.schemaId !== undefined) {
            const schema = await app.db.models.DataSchema.byId(request.params.schemaId)
            if (!schema || schema.TeamId !== request.team.id) {
                return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
            }
            request.dataSchema = schema
        }
        if (request.params.groupId !== undefined) {
            const group = await app.db.models.DataSchemaGroup.byId(request.params.groupId)
            if (!group || group.TeamId !== request.team.id) {
                return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
            }
            request.dataSchemaGroup = group
        }
    })

    await app.register(require('./groups'), { prefix: '/groups' })
    await app.register(require('./schemas'))
}
