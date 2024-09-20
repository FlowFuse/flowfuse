module.exports = {
    defaultPreHandler: async (app, request, reply) => {
        const applicationId = request.params.applicationId
        if (applicationId === undefined) {
            return
        }

        if (!applicationId) {
            return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }

        try {
            request.application = await app.db.models.Application.byId(applicationId)
            if (!request.application) {
                return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }

            if (request.session.User) {
                request.teamMembership = await request.session.User.getTeamMembership(request.application.Team.id)
                if (!request.teamMembership && !request.session.User.admin) {
                    return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            }
        } catch (err) {
            return reply.code(500).send({ code: 'unexpected_error', error: err.toString() })
        }
    }
}
