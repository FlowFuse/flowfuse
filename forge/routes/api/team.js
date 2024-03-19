const { Roles } = require('../../lib/roles')

const TeamDevices = require('./teamDevices.js')
const TeamInvitations = require('./teamInvitations.js')
const TeamMembers = require('./teamMembers.js')

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
 */
module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
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
    })

    app.post('/check-slug', {
        preHandler: app.needsPermission('team:create'),
        schema: {
            summary: 'Check a team slug is available',
            tags: ['Teams'],
            body: {
                type: 'object',
                required: ['slug'],
                properties: {
                    slug: { type: 'string' }
                }
            },
            response: {
                200: {
                    description: 'Team slug is available',
                    $ref: 'APIStatus'
                },
                409: {
                    description: 'Team slug is not available',
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const slug = request.body.slug.toLowerCase()
        const reservedNames = ['create']
        if (reservedNames.includes(slug)) {
            reply.code(409).send({ code: 'invalid_slug', error: 'Slug not available' })
            return
        }
        const existingCount = await app.db.models.Team.count({ where: { slug } })
        if (existingCount === 0) {
            reply.send({ status: 'okay' })
        } else {
            reply.code(409).send({ code: 'invalid_slug', error: 'Slug not available' })
        }
    })

    async function getTeamDetails (request, reply, team) {
        const result = app.db.views.Team.team(team)
        result.instanceCountByType = await team.instanceCountByType()
        if (app.license.active() && app.billing) {
            result.billing = {}
            const subscription = await team.getSubscription()
            if (subscription) {
                result.billing.active = subscription.isActive()
                result.billing.unmanaged = subscription.isUnmanaged()
                result.billing.canceled = subscription.isCanceled()
                result.billing.pastDue = subscription.isPastDue()
                if (subscription.isTrial()) {
                    result.billing.trial = true
                    result.billing.trialEnded = subscription.isTrialEnded()
                    result.billing.trialEndsAt = subscription.trialEndsAt
                    result.billing.trialProjectAllowed = (await team.instanceCount(app.settings.get('user:team:trial-mode:projectType'))) === 0
                }
                if (request.session.User.admin) {
                    result.billing.customer = subscription.customer
                    result.billing.subscription = subscription.subscription
                }
            } else {
                result.billing.active = false
            }
        }
        reply.send(result)
    }

    app.register(TeamMembers, { prefix: '/:teamId/members' })
    app.register(TeamInvitations, { prefix: '/:teamId/invitations' })
    app.register(TeamDevices, { prefix: '/:teamId/devices' })

    /**
     * Get the details of a team
     * /api/v1/teams/:teamId
     */
    app.get('/:teamId', {
        preHandler: app.needsPermission('team:read'),
        schema: {
            summary: 'Get details of a team',
            tags: ['Teams'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'Team'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        await getTeamDetails(request, reply, request.team)
    })

    /**
     * Get the details of a team via its slug
     *
     * /api/v1/teams/slug/:teamSlug
     */
    app.get('/slug/:teamSlug', {
        preHandler: app.needsPermission('team:read'),
        schema: {
            summary: 'Get details of a team using its slug',
            tags: ['Teams'],
            params: {
                type: 'object',
                properties: {
                    teamSlug: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'Team'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        await getTeamDetails(request, reply, request.team)
    })

    /**
     * Get a list of all teams (admin-only)
     */
    app.get('/', {
        preHandler: app.needsPermission('team:list'),
        schema: {
            summary: 'Get a list of all teams - admin-only',
            tags: ['Teams'],
            query: { $ref: 'PaginationParams' },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        teams: { type: 'array', items: { $ref: 'Team' } }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // Admin request for all teams
        const paginationOptions = app.getPaginationOptions(request)
        const teams = await app.db.models.Team.getAll(paginationOptions)
        teams.teams = teams.teams.map(t => app.db.views.Team.team(t))
        reply.send(teams)
    })

    /**
     * Get a list of the teams applications
     * /api/v1/teams/:teamId/applications
     */
    app.get('/:teamId/applications', {
        preHandler: app.needsPermission('team:projects:list'), // TODO Using project level permissions
        schema: {
            summary: 'Get a list of the teams applications',
            tags: ['Teams'],
            query: {
                associationsLimit: { type: 'number' }
            },
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        // meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        applications: { $ref: 'TeamApplicationList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const includeInstances = true
        const includeApplicationDevices = true
        const associationsLimit = request.query.associationsLimit
        const includeApplicationSummary = !!associationsLimit

        const applications = await app.db.models.Application.byTeam(request.params.teamId, { includeInstances, includeApplicationDevices, associationsLimit, includeApplicationSummary })

        reply.send({
            count: applications.length,
            applications: await app.db.views.Application.teamApplicationList(applications, { includeInstances, includeApplicationDevices, includeApplicationSummary })
        })
    })

    /**
     * List team application associations (devices and instances) statuses
     * @name /api/v1/teams:teamId/applications/status
     * @memberof forge.routes.api.application
     */
    app.get('/:teamId/applications/status', {
        preHandler: app.needsPermission('team:projects:list'), // TODO Using project level permissions
        schema: {
            summary: 'Get a list of the teams applications statuses',
            tags: ['Teams'],
            query: {
                associationsLimit: { type: 'number' }
            },
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        // meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        applications: { $ref: 'ApplicationAssociationsStatusList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const includeInstances = true
        const includeApplicationDevices = true
        const associationsLimit = request.query.associationsLimit

        const applications = await app.db.models.Application.byTeam(request.params.teamId, { includeInstances, includeApplicationDevices, includeInstanceStorageFlow: true, associationsLimit })
        if (!applications) {
            return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
        const applicationsWithAssociationsStatuses = await app.db.views.Application.applicationAssociationsStatusList(applications)
        reply.send({
            count: applicationsWithAssociationsStatuses.length,
            applications: applicationsWithAssociationsStatuses
        })
    })

    /**
     * @deprecated Use /:teamId/applications, or /:applicationId/instances
     * This end-point is still used by:
     *  - the project nodes and nr-tools plugin.
     *  - the Team Instances view
     *  - team/Devices/dialogs/CreateProvisionTokenDialog.vue
     *  - team/Settings/Devices.vue
     */
    app.get('/:teamId/projects', {
        preHandler: app.needsPermission('team:projects:list')
    }, async (request, reply) => {
        const projects = await app.db.models.Project.byTeam(request.params.teamId)
        if (projects) {
            let result = await app.db.views.Project.instancesList(projects)
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
     * /api/v1/teams
     */
    app.post('/', {
        preHandler: app.needsPermission('team:create'),
        schema: {
            summary: 'Create a new team',
            tags: ['Teams'],
            body: {
                type: 'object',
                required: ['name', 'type'],
                properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    slug: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'Team'
                },
                '4xx': {
                    $ref: 'APIError'
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
        if (!teamType || !teamType.active) {
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
            await app.auditLog.Platform.platform.team.created(request.session.User, null, team)
            await app.auditLog.Team.team.created(request.session.User, null, team)
            await app.auditLog.Team.team.user.added(request.session.User, null, team, request.session.User)

            const teamView = app.db.views.Team.team(team)

            if (app.license.active() && app.billing) {
                const session = await app.billing.createSubscriptionSession(team, request.session.User)
                app.auditLog.Team.billing.session.created(request.session.User, null, team, session)
                teamView.billingURL = session.url
            }

            reply.send(teamView)
        } catch (err) {
            // prepare response
            const resp = { code: 'unexpected_error', error: err.toString() }
            // update resp.error is the error has an errors array
            if (err.errors) {
                resp.error = err.errors.map(err => err.message).join(',')
            }
            // audit log to platform & team
            await app.auditLog.Platform.platform.team.created(request.session.User, resp, team)
            await app.auditLog.Team.team.created(request.session.User, resp, team)
            // destroy team if it was created
            if (team !== undefined) {
                // safe to destroy because it will have only 1 owner and no projects
                await team.destroy()
                await app.auditLog.Platform.platform.team.deleted(0, null, team)
            }
            reply.code(400).send(resp)
        }
    })

    /**
     * Delete a team
     * /api/v1/teams/:teamId
     */
    app.delete('/:teamId', {
        preHandler: app.needsPermission('team:delete'),
        schema: {
            summary: 'Delete a team',
            tags: ['Teams'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // At this point we know the requesting user has permission to do this.
        // But we also need to ensure the team has no projects
        // That is handled by the beforeDestroy hook on the Team model and the
        // call to destroy the team will throw an error
        try {
            const instanceCount = await request.team.instanceCount()
            if (instanceCount > 0) {
                // need to delete Instances
                const instances = await app.db.models.Project.byTeam(request.team.hashid)
                for (const instance of instances) {
                    try {
                        await app.containers.remove(instance)
                    } catch (err) {
                        if (err?.statusCode !== 404) {
                            throw err
                        }
                    }

                    await instance.destroy()
                    await app.auditLog.Team.project.deleted(request.session.User, null, request.team, instance)
                    await app.auditLog.Project.project.deleted(request.session.User, null, request.team, instance)
                }
            }

            // Delete Applications
            const applications = await app.db.models.Application.byTeam(request.team.hashid)
            for (const application of applications) {
                await application.destroy()
                await app.auditLog.Team.application.deleted(request.session.User, null, request.team, application)
            }

            // Delete Devices
            const where = {
                TeamId: request.team.id
            }
            const devices = await app.db.models.Device.getAll({}, where, { includeInstanceApplication: true })
            for (const device of devices.devices) {
                await device.destroy()
                await app.auditLog.Team.team.device.deleted(request.session.User, null, request.team, device)
            }

            if (app.license.active() && app.billing) {
                const subscription = await request.team.getSubscription()
                if (subscription && !subscription.isTrial() && !subscription.isUnmanaged()) {
                    await app.billing.closeSubscription(subscription)
                }
            }

            await request.team.destroy()
            await app.auditLog.Platform.platform.team.deleted(request.session.User, null, request.team)
            await app.auditLog.Team.team.deleted(request.session.User, null, request.team)
            reply.send({ status: 'okay' })
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Platform.platform.team.deleted(request.session.User, resp, request.team)
            await app.auditLog.Team.team.deleted(request.session.User, resp, request.team)
            reply.code(400).send(resp)
        }
    })

    /**
     * Update a team
     * /api/v1/teams/:teamId
     */
    app.put('/:teamId', {
        preHandler: app.needsPermission('team:edit'),
        schema: {
            summary: 'Update a team',
            tags: ['Teams'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    slug: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'Team'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        let updates
        let auditLogFunc = app.auditLog.Team.team.settings.updated
        try {
            if (request.body.type) {
                auditLogFunc = app.auditLog.Team.team.type.changed
                if (Object.keys(request.body).length > 1) {
                    reply.code(400).send({ code: 'invalid_request', error: 'Cannot modify other properties whilst changing type' })
                    return
                }
                if (request.body.type !== request.team.TeamType.hashid) {
                    const targetTeamType = await app.db.models.TeamType.byId(request.body.type)
                    if (!targetTeamType) {
                        reply.code(400).send({ code: 'invalid_team_type', error: 'Invalid team type' })
                        return
                    }
                    updates = {
                        old: { id: request.team.TeamType.hashid, name: request.team.TeamType.name },
                        new: { id: targetTeamType.hashid, name: targetTeamType.name }
                    }
                    // Two stage process to update team type
                    // - first we check its allowed.
                    await request.team.checkTeamTypeUpdateAllowed(targetTeamType)
                    // - then we apply it
                    await request.team.updateTeamType(targetTeamType)
                } else {
                    reply.send(app.db.views.Team.team(request.team))
                    return
                }
            } else {
                updates = new app.auditLog.formatters.UpdatesCollection()
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
            }
            auditLogFunc(request.session.User, null, request.team, updates)
            reply.send(app.db.views.Team.team(request.team))
        } catch (err) {
            auditLogFunc(request.session.User, err, request.team, updates)
            const response = {
                code: err.code || 'unexpected_error',
                error: err.toString()
            }
            if (/SequelizeUniqueConstraintError/.test(response.error)) {
                if (err.errors) {
                    // This is an error from sequelize - reformat the message to be more helpful
                    response.error = err.errors.map(e => e.message).join(', ')
                }
            } else if (err.errors) {
                response.errors = err.errors
            }
            reply.code(400).send(response)
        }
    })

    /**
     * Get the session users team membership
     * @name /api/v1/team/:teamId/user
     * @static
     * @memberof forge.routes.api.team
     */
    app.get('/:teamId/user', {
        schema: {
            summary: 'Get the current users team membership',
            tags: ['Teams'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        role: { type: 'number' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
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
    app.get('/:teamId/audit-log', {
        preHandler: app.needsPermission('team:audit-log'),
        schema: {
            summary: 'Get team audit event entries',
            tags: ['Teams'],
            query: {
                allOf: [
                    { $ref: 'PaginationParams' },
                    { $ref: 'AuditLogQueryParams' }
                ]
            },
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        log: { $ref: 'AuditLogEntryList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const logEntries = await app.db.models.AuditLog.forTeam(request.team.id, paginationOptions)
        const result = app.db.views.AuditLog.auditLog(logEntries)
        reply.send(result)
    })
}
