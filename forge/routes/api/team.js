const TeamMembers = require('./teamMembers.js')
const TeamInvitations = require('./teamInvitations.js')
const TeamDevices = require('./teamDevices.js')
const { Roles } = require('../../lib/roles')

/**
 * Team api routes
 *
 * - /api/v1/teams
 *
 * - Any route that has a :teamId parameter will:
 *    - Ensure the session user is either admin or has a role on the team
 *    - request.team prepopulated with the team object
 *    - request.teamMembership prepopulated with the user role ({role: "member"})
 *      (unless they are admin)
 *
 * @namespace team
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.teamId !== undefined) {
            if (request.params.teamId) {
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
                            if (project && project.Team.hashid === request.params.teamId) {
                                return
                            }
                        }
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    request.teamMembership = await request.session.User.getTeamMembership(request.params.teamId)
                    if (!request.teamMembership && !request.session.User?.admin) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    request.team = await app.db.models.Team.byId(request.params.teamId)
                    if (!request.team) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    }
                } catch (err) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            } else {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    })

    async function getTeamDetails (request, reply, team) {
        const result = app.db.views.Team.team(team)
        if (app.license.active() && app.billing) {
            const subscription = await app.db.models.Subscription.byTeamId(team.id)
            result.billingSetup = !!subscription
            result.subscriptionActive = !!subscription?.isActive()
        }
        reply.send(result)
    }

    app.register(TeamMembers, { prefix: '/:teamId/members' })
    app.register(TeamInvitations, { prefix: '/:teamId/invitations' })
    app.register(TeamDevices, { prefix: '/:teamId/devices' })
    /**
     * Get the details of a team
     * @name /api/v1/teams
     * @static
     * @memberof forge.routes.api.team
     */
    app.get('/:teamId', {
        preHandler: app.needsPermission('team:read')
    }, async (request, reply) => {
        await getTeamDetails(request, reply, request.team)
    })

    /**
     * Return all teams (admin-only) or details of a specific team if 'slug' query
     * parameter is set
     *
     * @name /api/v1/teams
     * @static
     * @memberof forge.routes.api.team
     */
    app.get('/', async (request, reply) => {
        // This isn't the most pleasant overloading of an api end-point.
        // We can probably do better.
        if (request.query.slug) {
            const team = await app.db.models.Team.bySlug(request.query.slug)
            if (team) {
                const teamMembership = await request.session.User.getTeamMembership(team.id)
                if (!teamMembership && !request.session.User?.admin) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    return
                }
                await getTeamDetails(request, reply, team)
            } else {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        } else if (!request.session.User || !request.session.User.admin) {
            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
        } else {
            // Admin request for all teams
            const paginationOptions = app.getPaginationOptions(request)
            const teams = await app.db.models.Team.getAll(paginationOptions)
            teams.teams = teams.teams.map(t => app.db.views.Team.team(t))
            reply.send(teams)
        }
    })

    app.get('/:teamId/projects', {
        preHandler: app.needsPermission('team:projects:list')
    }, async (request, reply) => {
        const projects = await app.db.models.Project.byTeam(request.params.teamId)
        if (projects) {
            let result = await app.db.views.Project.teamProjectList(projects)
            if (request.session.ownerType === 'project') {
                // This request is from a project token. Filter the list to return
                // the minimal information needed
                result = result.map(e => {
                    return { id: e.id, name: e.name }
                })
            }
            reply.send({
                count: result.length,
                projects: result
            })
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    /**
     * Create a new team
     * @name /api/v1/teams
     * @static
     * @memberof forge.routes.api.team
     */
    app.post('/', {
        preHandler: app.needsPermission('team:create'),
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    slug: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        if (!request.session.User.admin && !app.settings.get('team:create')) {
            // Ideally this would be handled by `needsPermission`
            // preHandler. To do so will require the perms model to know
            // to also check enabled features (and know that admin is allowed to
            // override in this instance)
            reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
        }

        // TODO check license allows multiple teams

        if (request.body.slug === 'create') {
            reply.code(400).send({ code: 'invalid_slug', error: 'slug not available' })
            return
        }

        const teamType = await app.db.models.TeamType.byId(request.body.type)
        if (!teamType || !teamType.enabled) {
            reply.code(400).send({ code: 'invalid_team_type', error: 'unknown team type' })
            return
        }

        let team

        try {
            team = await app.db.controllers.Team.createTeamForUser({
                name: request.body.name,
                slug: request.body.slug,
                TeamTypeId: teamType.id
            }, request.session.User)
            await app.auditLog.Team.team.created(request.session.User, null, team)
            await app.auditLog.Team.team.user.added(request.session.User, null, team, request.session.User)

            const teamView = app.db.views.Team.team(team)

            if (app.license.active() && app.billing) {
                let coupon
                if (request.cookies.ff_coupon) {
                    coupon = request.unsignCookie(request.cookies.ff_coupon)?.valid ? request.unsignCookie(request.cookies.ff_coupon).value : undefined
                }
                const session = await app.billing.createSubscriptionSession(team, coupon, request.session.User)
                app.auditLog.Team.billing.session.created(request.session.User, null, team, session)
                teamView.billingURL = session.url
            }

            reply.send(teamView)
        } catch (err) {
            if (team !== undefined) {
                // safe to destory because it will have only 1 owner and no projects
                await team.destroy()
            }

            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            reply.clearCookie('ff_coupon', { path: '/' })
            reply.code(400).send({ code: 'unexpected_error', error: responseMessage })
        }
    })

    /**
     * Delete a team
     * @name /api/v1/teams/:teamId
     * @static
     * @memberof forge.routes.api.team
     */
    app.delete('/:teamId', { preHandler: app.needsPermission('team:delete') }, async (request, reply) => {
        // At this point we know the requesting user has permission to do this.
        // But we also need to ensure the team has no projects
        // That is handled by the beforeDestroy hook on the Team model and the
        // call to destroy the team will throw an error
        try {
            if (app.license.active() && app.billing) {
                const subscription = await app.db.models.Subscription.byTeamId(request.team.id)
                if (subscription) {
                    // const subId = subscription.subscription
                    await app.billing.closeSubscription(subscription)
                    await app.auditLog.Team.billing.subscription.deleted(request.session.User, null, request.team, subscription)
                }
            }
            await request.team.destroy()
            await app.auditLog.Team.team.deleted(request.session.User, null, request.team)
            reply.send({ status: 'okay' })
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Team.team.deleted(request.session.User, resp, request.team)
            reply.code(400).send(resp)
        }
    })

    /**
     * Update a team
     * @name /api/v1/teams/:teamId
     * @static
     * @memberof forge.routes.api.team
     */
    app.put('/:teamId', { preHandler: app.needsPermission('team:edit') }, async (request, reply) => {
        try {
            const updates = new app.auditLog.formatters.UpdatesCollection()
            if (request.body.name) {
                updates.push('name', request.team.name, request.body.name)
                request.team.name = request.body.name
            }
            if (request.body.slug) {
                if (request.body.slug === 'create') {
                    reply.code(400).send({ code: 'invalid_slug', error: 'slug not available' })
                    return
                }
                updates.push('slug', request.team.slug, request.body.slug)
                request.team.slug = request.body.slug
            }
            await request.team.save()
            app.auditLog.Team.team.settings.updated(request.session.User, null, request.team, updates)
            reply.send(app.db.views.Team.team(request.team))
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            reply.code(400).send({ code: 'unexpected_error', error: responseMessage })
        }
    })

    /**
     * Get the session users team membership
     * @name /api/v1/team/:teamId/user
     * @static
     * @memberof forge.routes.api.team
     */
    app.get('/:teamId/user', async (request, reply) => {
        if (request.teamMembership) {
            reply.send({
                role: request.teamMembership.role
            })
            return
        } else if (request.session.User?.admin) {
            reply.send({
                role: Roles.Admin
            })
            return
        }
        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
    })

    /**
     * Get the team audit log
     * @name /api/v1/team/:teamId/audit-log
     * @memberof forge.routes.api.project
     */
    app.get('/:teamId/audit-log', { preHandler: app.needsPermission('team:audit-log') }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const logEntries = await app.db.models.AuditLog.forTeam(request.team.id, paginationOptions)
        const result = app.db.views.AuditLog.auditLog(logEntries)
        reply.send(result)
    })
}
