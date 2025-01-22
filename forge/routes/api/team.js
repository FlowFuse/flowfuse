const crypto = require('crypto')

const { Op } = require('sequelize')

const { Roles } = require('../../lib/roles')

const teamShared = require('./shared/team.js')
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
    app.addHook('preHandler', teamShared.defaultPreHandler.bind(null, app))

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
        if (!request.session.User?.admin && request.teamMembership.role < Roles.Viewer) {
            // Return summary details for any role less than Viewer (eg dashboard)
            reply.send(app.db.views.Team.teamSummary(team))
            return
        }
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
        const where = {}
        const filters = []
        if (request.query.teamType) {
            const teamTypes = request.query.teamType.split(',').map(app.db.models.TeamType.decodeHashid).flat()
            filters.push({ TeamTypeId: { [Op.in]: teamTypes } })
        }
        if (request.query.state === 'suspended') {
            filters.push({ suspended: true })
        } else if (app.billing && request.query.billing) {
            filters.push({ suspended: false })
            const billingStates = request.query.billing.split(',')
            filters.push({ '$Subscription.status$': { [Op.in]: billingStates } })
        }
        if (filters.length > 0) {
            where[Op.and] = filters
        }
        const paginationOptions = app.getPaginationOptions(request)
        const teams = await app.db.models.Team.getAll(paginationOptions, where)
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
        const includeApplicationSummary = !!associationsLimit || request.query.includeApplicationSummary

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
        const projects = await app.db.models.Project.byTeam(request.params.teamId, { includeSettings: true })
        if (projects) {
            let result = await app.db.views.Project.instancesList(projects, { includeSettings: true })
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
     * Get team instances that have dashboards installed
     * /api/v1/teams/:teamId/dashboard-instances
     */
    app.get('/:teamId/dashboard-instances', {
        preHandler: app.needsPermission('team:read')
    }, async (request, reply) => {
        const projects = await app.db.models.Project.byTeamForDashboard(request.params.teamId)
        if (projects && projects.length > 0) {
            // filters out projects/instances without dashboards
            const filtered = projects.filter(project => {
                return project.ProjectSettings.filter(settingEntry => {
                    const isSettingsEntry = settingEntry.key === 'settings'
                    let hasDashboardInstalled = false
                    if (
                        isSettingsEntry &&
                        Object.prototype.hasOwnProperty.call(settingEntry.value, 'palette') &&
                        Object.prototype.hasOwnProperty.call(settingEntry.value.palette, 'modules')
                    ) {
                        hasDashboardInstalled = !!settingEntry.value.palette.modules.find(module => module.name === '@flowfuse/node-red-dashboard')
                    }

                    return isSettingsEntry && hasDashboardInstalled
                }).length > 0
            })

            if (filtered.length === 0) {
                return reply.send({
                    count: 0,
                    projects: []
                })
            }

            // map additional data
            await Promise.all(filtered.map(async project => {
                const projectStatePromise = project.liveState()
                const projectState = await projectStatePromise
                project.state = projectState.meta.state
                project.flowLastUpdatedAt = projectState.flowLastUpdatedAt
                project.settings = {
                    dashboard2UI: '/dashboard' // hardcoding the dashboard endpoint for the time being
                }
            }))

            const result = await app.db.views.Project.dashboardInstancesSummaryList(filtered)
            return reply.send({
                count: result.length,
                projects: result
            })
        } else {
            return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    async function createTeamApplication (user, team) {
        const applicationName = `${user.name}'s Application`
        const application = await app.db.models.Application.create({
            name: applicationName.charAt(0).toUpperCase() + applicationName.slice(1),
            TeamId: team.id
        })
        await app.auditLog.Team.application.created(user, null, team, application)
        await app.auditLog.Application.application.created(user, null, application)
        return application
    }

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
                    slug: { type: 'string' },
                    trial: { type: 'boolean' }
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

        let trialMode = false
        if (app.license.active() && app.billing && request.body.trial) {
            // Check this user is allowed to create a trial team of this type.
            // Rules:
            // 1. teamType must have trial mode enabled
            const teamTrialActive = await teamType.getProperty('trial.active', false)
            if (!teamTrialActive) {
                reply.code(400).send({ code: 'invalid_request', error: 'trial mode not available' })
                return
            }
            // 2. user must have no existing teams
            const existingTeamCount = await app.db.models.Team.countForUser(request.session.User)
            if (existingTeamCount > 0) {
                reply.code(400).send({ code: 'invalid_request', error: 'trial mode not available' })
                return
            }
            // 3. user must be < 1 week old
            const delta = Date.now() - request.session.User.createdAt.getTime()
            if (delta > 1000 * 60 * 60 * 24 * 7) {
                reply.code(400).send({ code: 'invalid_request', error: 'trial mode not available' })
                return
            }
            trialMode = true
        } else if (request.body.trial) {
            reply.code(400).send({ code: 'invalid_request', error: 'trial mode not available' })
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

            let defaultTeamCreated = false
            if (app.license.active() && app.billing) {
                if (trialMode) {
                    await app.billing.setupTrialTeamSubscription(team, request.session.User)
                    // In trial mode, we may also auto-create their first application and instance
                    if (app.settings.get('user:team:auto-create:instanceType')) {
                        const instanceTypeId = app.settings.get('user:team:auto-create:instanceType')
                        const instanceType = await app.db.models.ProjectType.byId(instanceTypeId)
                        const instanceStack = await instanceType?.getDefaultStack() || (await instanceType.getProjectStacks())?.[0]
                        const instanceTemplate = await app.db.models.ProjectTemplate.findOne({ where: { active: true } })
                        if (!instanceType) {
                            app.log.warn(`Unable to create Trial Instance in team ${team.hashid}: Instance type with id ${instanceTypeId} from 'user:team:auto-create:instanceType' not found`)
                        } else if (!instanceStack) {
                            app.log.warn(`Unable to create Trial Instance in team ${team.hashid}: Unable to find a stack for use with instance type ${instanceTypeId}`)
                        } else if (!instanceTemplate) {
                            app.log.warn(`Unable to create Trial Instance in team ${team.hashid}: Unable to find the default instance template`)
                        } else {
                            const safeTeamName = team.name.toLowerCase().replace(/[\W_]/g, '-')
                            const safeUserName = request.session.User.username.toLowerCase().replace(/[\W_]/g, '-')
                            const application = await createTeamApplication(request.session.User, team)
                            defaultTeamCreated = true
                            const instanceProperties = {
                                name: `${safeTeamName}-${safeUserName}-${crypto.randomBytes(4).toString('hex')}`
                            }
                            await app.db.controllers.Project.create(team, application, request.session.User, instanceType, instanceStack, instanceTemplate, instanceProperties)
                        }
                    }
                } else {
                    const session = await app.billing.createSubscriptionSession(team, request.session.User)
                    app.auditLog.Team.billing.session.created(request.session.User, null, team, session)
                    teamView.billingURL = session.url
                }
            }
            // Haven't created an application yet, but settings say we should
            if (!defaultTeamCreated && app.settings.get('user:team:auto-create:application')) {
                await createTeamApplication(request.session.User, team)
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
                    slug: { type: 'string' },
                    type: { type: 'string' },
                    suspended: { type: 'boolean' }
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
            } else if (Object.hasOwn(request.body, 'suspended')) {
                if (Object.keys(request.body).length > 1) {
                    reply.code(400).send({ code: 'invalid_request', error: 'Cannot modify other properties whilst changing suspended state' })
                    return
                }
                if (!!request.body.suspended !== !!request.team.suspended) {
                    let teamAuditFunc = app.auditLog.Team.team.suspended
                    let platformAuditFunc = app.auditLog.Platform.platform.team.suspended
                    try {
                        if (request.body.suspended) {
                            // Suspend the team
                            await request.team.suspend()
                        } else {
                            teamAuditFunc = app.auditLog.Team.team.unsuspended
                            platformAuditFunc = app.auditLog.Platform.platform.team.unsuspended
                            // Reactivate the team
                            await request.team.unsuspend()
                        }
                        teamAuditFunc(request.session.User, null, request.team)
                        platformAuditFunc(request.session.User, null, request.team)
                        reply.send(app.db.views.Team.team(request.team))
                        return
                    } catch (err) {
                        teamAuditFunc(request.session.User, err, request.team)
                        platformAuditFunc(request.session.User, err, request.team)
                        const response = {
                            code: err.code || 'unexpected_error',
                            error: err.toString()
                        }
                        reply.code(400).send(response)
                        return
                    }
                } else {
                    // Already in the right state - no-op it
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
                        log: { $ref: 'AuditLogEntryList' },
                        associations: {
                            type: 'object',
                            properties: {
                                applications: {
                                    type: 'array',
                                    items: { $ref: 'ApplicationSummary' }
                                },
                                instances: { $ref: 'InstanceSummaryList' },
                                devices: { $ref: 'DeviceSummaryList' }
                            }
                        }
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

    /**
     * Get the team audit log
     * @name /api/v1/team/:teamId/audit-log/export
     * @memberof forge.routes.api.project
     */
    app.get('/:teamId/audit-log/export', {
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
                    content: {
                        'text/csv': {
                            schema: {
                                type: 'string'
                            }
                        }
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
        reply.type('text/csv').send([
            ['id', 'event', 'body', 'scope', 'trigger', 'createdAt'],
            ...result.log.map(row => [
                row.id,
                row.event,
                `"${row.body ? JSON.stringify(row.body).replace(/"/g, '""') : ''}"`,
                `"${JSON.stringify(row.scope).replace(/"/g, '""')}"`,
                `"${JSON.stringify(row.trigger).replace(/"/g, '""')}"`,
                row.createdAt?.toISOString()
            ])
        ]
            .map(row => row.join(','))
            .join('\r\n'))
    })
}
