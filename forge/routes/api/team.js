const TeamMembers = require('./teamMembers.js')
const TeamInvitations = require('./teamInvitations.js')
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
                    request.teamMembership = await request.session.User.getTeamMembership(request.params.teamId)
                    if (!request.teamMembership && !request.session.User.admin) {
                        reply.code(404).type('text/html').send('Not Found')
                        return
                    }
                    request.team = await app.db.models.Team.byId(request.params.teamId)
                    if (!request.team) {
                        reply.code(404).type('text/html').send('Not Found')
                    }
                } catch (err) {
                    reply.code(404).type('text/html').send('Not Found')
                }
            } else {
                reply.code(404).type('text/html').send('Not Found')
            }
        }
    })

    app.register(TeamMembers, { prefix: '/:teamId/members' })
    app.register(TeamInvitations, { prefix: '/:teamId/invitations' })

    /**
     * Get the details of a team
     * @name /api/v1/teams
     * @static
     * @memberof forge.routes.api.team
     */
    app.get('/:teamId', async (request, reply) => {
        reply.send(app.db.views.Team.team(request.team))
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
                if (!teamMembership && !request.session.User.admin) {
                    reply.code(404).type('text/html').send('Not Found')
                }
                reply.send(app.db.views.Team.team(team))
            } else {
                reply.code(404).type('text/html').send('Not Found')
            }
        } else if (!request.session.User.admin) {
            reply.code(401).send({ error: 'unauthorized' })
        } else {
            // Admin request for all teams
            const paginationOptions = app.getPaginationOptions(request)
            const teams = await app.db.models.Team.getAll(paginationOptions)
            teams.teams = teams.teams.map(t => app.db.views.Team.team(t))
            reply.send(teams)
        }
    })

    app.get('/:teamId/projects', async (request, reply) => {
        const projects = await app.db.models.Project.byTeam(request.params.teamId)
        if (projects) {
            const result = app.db.views.Project.teamProjectList(projects)
            reply.send({
                count: result.length,
                projects: result
            })
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })

    app.post('/', {
        preHandler: app.needsPermission('team:create'),
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string' },
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
            reply.code(403).send({ error: 'unauthorized' })
        }

        // TODO check license allows multiple teams

        if (request.body.slug === 'create') {
            reply.code(400).send({ error: 'slug not available' })
            return
        }

        try {
            const team = await app.db.controllers.Team.createTeamForUser({
                name: request.body.name,
                slug: request.body.slug
            }, request.session.User)

            const teamView = app.db.views.Team.team(team)

            if (app.license.get('billing')) {
                const session = await app.billing.createSubscriptionSession(team, request.session.User)
                teamView.billingURL = session.url
            }

            reply.send(teamView)
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            reply.code(400).send({ error: responseMessage })
        }
    })

    app.delete('/:teamId', { preHandler: app.needsPermission('team:delete') }, async (request, reply) => {
        // At this point we know the requesting user has permission to do this.
        // But we also need to ensure the team has no projects
        // That is handled by the beforeDestroy hook on the Team model and the
        // call to destroy the team will throw an error
        try {
            if (app.license.get('billing')) {
                const subscription = await app.db.models.Subscription.byTeam(request.team.id)
                if (subscription) {
                    await app.billing.closeSubscription(subscription)
                }
            }
            await request.team.destroy()
            reply.send({ status: 'okay' })
        } catch (err) {
            reply.code(400).send({ error: err.toString() })
        }
    })

    // app.get('/teams', async (request, reply) => {
    //     const teams = await app.db.models.Team.forUser(request.session.User);
    //     const result = await app.db.views.Team.teamList(teams);
    //     reply.send({
    //         count: result.length,
    //         teams:result
    //     })
    //
    //
    // })

    app.put('/:teamId', { preHandler: app.needsPermission('team:edit') }, async (request, reply) => {
        try {
            if (request.body.name) {
                request.team.name = request.body.name
            }
            if (request.body.slug) {
                if (request.body.slug === 'create') {
                    reply.code(400).send({ error: 'slug not available' })
                    return
                }
                request.team.slug = request.body.slug
            }
            await request.team.save()
            reply.send(app.db.views.Team.team(request.team))
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            reply.code(400).send({ error: responseMessage })
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
        } else if (request.session.User.admin) {
            reply.send({
                role: Roles.Admin
            })
            return
        }
        reply.code(404).type('text/html').send('Not Found')
    })

    /**
     *
     * @name /api/v1/team/:teamId/audit-log
     * @memberof forge.routes.api.project
     */
    app.get('/:teamId/audit-log', { preHandler: app.needsPermission('team:audit-log') }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const logEntries = await app.db.models.AuditLog.forTeam(request.team.id, paginationOptions)
        const result = app.db.views.AuditLog.auditLog(logEntries)
        // console.log(logEntries);
        reply.send(result)
    })
}
