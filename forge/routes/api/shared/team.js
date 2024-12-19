module.exports = {
    defaultPreHandler: async (app, request, reply) => {
        if (request.params.teamId !== undefined || request.params.teamSlug !== undefined) {
            // The route may provide either :teamId or :teamSlug
            if (request.params.teamId || request.params.teamSlug) {
                let teamId = request.params.teamId
                if (request.params.teamSlug) {
                    // If :teamSlug is provided, need to lookup the team to get
                    // its id for subsequent checks
                    request.team = await app.db.models.Team.bySlug(request.params.teamSlug)
                    if (!request.team) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    teamId = request.team.hashid
                }

                try {
                    if (!request.session.User) {
                        // If request.session.User is not defined, this request is being
                        // made with an access token. If it is a project access token,
                        // ensure that project is in this team
                        if (request.session.ownerType === 'project') {
                            // Want this to be as small a query as possible. Sequelize
                            // doesn't make it easy to just get `TeamId` without doing
                            // a join on Team table.
                            const project = await app.db.models.Project.findOne({
                                where: { id: request.session.ownerId },
                                include: {
                                    model: app.db.models.Team,
                                    attributes: ['hashid', 'id']
                                }
                            })
                            // Ensure the token's project is in the team being accessed
                            if (project && project.Team.hashid === teamId) {
                                return
                            }
                        } else if (request.session.ownerType === 'device') {
                            // Want this to be as small a query as possible. Sequelize
                            // doesn't make it easy to just get `TeamId` without doing
                            // a join on Team table.
                            const device = await app.db.models.Device.findOne({
                                where: { id: request.session.ownerId },
                                include: {
                                    model: app.db.models.Team,
                                    attributes: ['hashid', 'id']
                                }
                            })
                            // Ensure the device is in the team being accessed
                            if (device && device.Team.hashid === teamId) {
                                return
                            }
                        }
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    request.teamMembership = await request.session.User.getTeamMembership(teamId)
                    if (!request.teamMembership && !request.session.User?.admin) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    if (!request.team) {
                        // For a :teamId route, we can now lookup the full team object
                        request.team = await app.db.models.Team.byId(request.params.teamId)
                        if (!request.team) {
                            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        }
                    }
                } catch (err) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            } else {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    }
}
