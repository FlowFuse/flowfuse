const { Op } = require('sequelize')

const { parseCallToAction, parseVideoReference } = require('../../lib/announcements.js')
const { Roles } = require('../../lib/roles.js')
const { buildTeamFilterWhere } = require('../../lib/teamFilters.js')

// The most teams a single announcement can be addressed to explicitly. Also
// caps the id list returned for a select-all, so a large platform cannot turn
// one click into an unbounded response.
const MAX_AUDIENCE_TEAMS = 10000

module.exports = async function (app) {
    async function getStats () {
        const userCount = await app.db.models.User.count({ attributes: ['admin'], group: 'admin' })
        const projectStateCounts = await app.db.models.Project.count({ attributes: ['state'], group: 'state' })
        const teamTypeCounts = await app.db.models.Team.count({ attributes: ['TeamTypeId'], group: 'TeamTypeId' })
        const teamTypes = await app.db.models.TeamType.findAll({ attributes: ['id', 'name'] })
        const teamTypesMap = {}
        teamTypes.forEach(tt => {
            teamTypesMap[tt.id] = tt.name
        })
        const license = await app.license.get() || app.license.defaults
        const result = {
            userCount: 0,
            maxUsers: license.users,
            adminCount: 0,
            inviteCount: await app.db.models.Invitation.count(),
            teamCount: await app.db.models.Team.count(),
            maxTeams: license.teams,
            teamsByType: {},
            instanceCount: 0,
            maxInstances: license.projects || license.instances,
            instancesByState: {},
            deviceCount: await app.db.models.Device.count(),
            devicesByMode: {}
        }
        if (Object.hasOwn(license, 'devices')) {
            result.maxDevices = license.devices
        }
        if (app.license.active()) {
            const { mqttClients } = await app.license.usage('mqttClients')
            result.maxMqttClients = mqttClients.limit
            result.mqttClientCount = mqttClients.count
        }
        userCount.forEach(u => {
            result.userCount += u.count
            if (u.admin) {
                result.adminCount = u.count
            }
        })

        projectStateCounts.forEach(projectState => {
            result.instanceCount += projectState.count
            result.instancesByState[projectState.state] = projectState.count
        })

        teamTypeCounts.forEach(teamTypeCount => {
            result.teamsByType[teamTypesMap[teamTypeCount.TeamTypeId]] = teamTypeCount.count
        })

        const deviceModeCounts = await app.db.models.Device.count({ attributes: ['mode'], group: 'mode' })
        deviceModeCounts.forEach(mode => {
            result.devicesByMode[mode.mode] = mode.count
        })
        const now = Date.now()
        const devicesByLastSeenNever = await app.db.models.Device.count({ where: { lastSeenAt: null } })
        const devicesByLastSeenDay = await app.db.models.Device.count({ where: { lastSeenAt: { [Op.gte]: new Date(now - 1000 * 60 * 60 * 24) } } })
        const devicesByLastSeenWeek = await app.db.models.Device.count({ where: { lastSeenAt: { [Op.gte]: new Date(now - 1000 * 60 * 60 * 24 * 7) } } })
        const devicesByLastSeenMonth = await app.db.models.Device.count({ where: { lastSeenAt: { [Op.gte]: new Date(now - 1000 * 60 * 60 * 24 * 7 * 4) } } })
        result.devicesByLastSeen = {
            never: devicesByLastSeenNever,
            day: devicesByLastSeenDay,
            week: devicesByLastSeenWeek - devicesByLastSeenDay,
            month: devicesByLastSeenMonth - devicesByLastSeenWeek,
            older: result.deviceCount - devicesByLastSeenNever - devicesByLastSeenMonth
        }

        if (app.billing) {
            const teamStateCounts = await app.db.models.Subscription.count({ attributes: ['status'], group: 'status' })
            result.teamsByBillingState = {}
            teamStateCounts.forEach(teamState => {
                result.teamsByBillingState[teamState.status] = teamState.count
            })

            const trialStats = await app.db.models.Subscription.count({ where: { status: 'trial' }, attributes: ['trialStatus'], group: 'trialStatus' })
            result.trialsByState = {}
            trialStats.forEach(trialStat => {
                result.trialsByState[trialStat.trialStatus] = trialStat.count
            })
        }
        return result
    }

    /**
     * Converts a JSON Object to a flattened object with key names more aligned
     * with OpenMetrics format
     * ```
     * {
     *    propertyOne: 1,
     *    propertyTwo: {
     *       colour: 'red'
     *    }
     * }
     * ```
     * becomes
     * ```
     * {
     *    property_one: 1,
     *    property_two_colour: 'red'
     * }
     * ```
     * @param {string} root the root of the new key name to apply
     * @param {Object} obj the object to flatten
     * @returns a flattened object
     */
    function flattenObject (root, obj) {
        let result = {}
        const rootKey = root ? `${root}_` : ''
        for (const [key, value] of Object.entries(obj)) {
            const formattedKey = `${rootKey}${key}`
                .replace(/[A-Z]/g, m => '_' + m.toLowerCase())
                // OpenMetrics names must match [a-zA-Z_:][a-zA-Z0-9_:]* - fold
                // any other char (spaces etc from data like team type names) to _
                .replace(/[^a-zA-Z0-9_:]/g, '_')
                .replace(/_{2,}/g, '_')
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                result[formattedKey] = value
            } else {
                const values = flattenObject(formattedKey, obj[key])
                result = { ...result, ...values }
            }
        }
        return result
    }
    /**
     * Stringifies a JSON Object to OpenMetrics format
     * @param {Object} stats the object to conver
     * @returns a OpenMetrics formatted version of the object
     */
    function convertToOpenMetrics (stats) {
        const result = flattenObject('flowforge', stats)
        const lines = Object.entries(result).map(([key, value]) => `${key} ${value}`)
        return lines.join('\n') + '\n'
    }

    app.get('/stats', {
        preHandler: app.needsPermission('platform:stats'),
        config: {
            rateLimit: app.config.rate_limits
        },
        schema: {
            summary: 'Get a platform stats - admin-only',
            tags: ['Platform'],
            response: {
                200: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                additionalProperties: true
                            }
                        },
                        'application/openmetrics-text': {
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
        const stats = await getStats()

        if (request.headers.accept?.includes('application/openmetrics-text')) {
            reply.send(convertToOpenMetrics(stats))
        } else {
            reply.send(stats)
        }
    })

    app.get('/license', {
        preHandler: app.needsPermission('license:read'),
        schema: {
            summary: 'Get a platform license - admin-only',
            tags: ['Platform'],
            response: {
                200: {
                    type: 'object',
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        reply.send(app.license.get() || {})
    })

    app.put('/license', {
        preHandler: app.needsPermission('license:edit'),
        schema: {
            summary: 'Apply a platform license - admin-only',
            tags: ['Platform'],
            body: {
                type: 'object',
                required: ['license', 'action'],
                properties: {
                    license: { type: 'string' },
                    action: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            if (request.body.action === 'apply') {
                await app.license.apply(request.body.license)
                const license = app.license.get() || {}
                await app.auditLog.Platform.platform.license.applied(request.session.User, null, license)
                reply.send(license)
            } else if (request.body.action === 'inspect') {
                const license = await app.license.inspect(request.body.license)
                await app.auditLog.Platform.platform.license.inspected(request.session.User, null, license)
                reply.send(license)
            } else {
                reply.code(400).send({ code: 'invalid_license_action', error: 'Invalid action' })
            }
        } catch (err) {
            let responseMessage = err.toString()
            if (/malformed/.test(responseMessage)) {
                responseMessage = 'Failed to parse license'
            }
            const resp = { code: 'invalid_license', error: responseMessage }
            if (request.body.action === 'apply') {
                await app.auditLog.Platform.platform.license.applied(request.session.User, resp, request.body.license)
            } else if (request.body.action === 'inspect') {
                await app.auditLog.Platform.platform.license.inspected(request.session.User, resp, request.body.license)
            }
            reply.code(400).send(resp)
        }
    })

    app.get('/invitations', {
        preHandler: app.needsPermission('invitation:list'),
        schema: {
            summary: 'Get a list of all invitations - admin-only',
            tags: ['Platform'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        // meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        invitations: { $ref: 'InvitationList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // TODO: Pagination
        const invitations = await app.db.models.Invitation.get()
        const result = app.db.views.Invitation.invitationList(invitations)
        reply.send({
            meta: {}, // For future pagination
            count: result.length,
            invitations: result
        })
    })

    /**
     * Get platform audit logs
     * @name /api/v1/admin/audit-log
     * @memberof forge.routes.api.admin
     */
    app.get('/audit-log', {
        preHandler: app.needsPermission('platform:audit-log'),
        schema: {
            summary: 'Get platform audit event entries - admin-only',
            tags: ['Platform'],
            query: {
                allOf: [
                    { $ref: 'PaginationParams' },
                    { $ref: 'AuditLogQueryParams' }
                ]
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
        const logEntries = await app.db.models.AuditLog.forPlatform(paginationOptions)
        const result = app.db.views.AuditLog.auditLog(logEntries)
        reply.send(result)
    })

    /**
     * Get platform audit logs as CSV
     * @name /api/v1/admin/audit-log/export
     * @memberof forge.routes.api.admin
     */
    app.get('/audit-log/export', {
        preHandler: app.needsPermission('platform:audit-log'),
        schema: {
            summary: 'Gets platform audit events as CSV - admin-only',
            tags: ['Platform'],
            query: {
                allOf: [
                    { $ref: 'PaginationParams' },
                    { $ref: 'AuditLogQueryParams' }
                ]
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
        const logEntries = await app.db.models.AuditLog.forPlatform(paginationOptions)
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

    app.post('/stats-token', {
        preHandler: app.needsPermission('platform:stats:token'),
        schema: {
            summary: 'Regenerate platform stats access token - admin-only',
            tags: ['Platform'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        token: { type: 'string' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const token = await app.db.controllers.AccessToken.generatePlatformStatisticsToken(request.session.User)
        reply.send(token)
    })
    app.delete('/stats-token', {
        preHandler: app.needsPermission('platform:stats:token'),
        schema: {
            summary: 'Remove platform stats access token - admin-only',
            tags: ['Platform'],
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
        await app.db.controllers.AccessToken.removePlatformStatisticsToken()
        reply.send({ status: 'okay' })
    })

    app.post('/expert-agent-creds', {
        preHandler: [app.blockPAT, app.needsPermission('platform:expert-agent:creds')],
        schema: {
            summary: 'Regenerate expert agent credentials - admin-only',
            tags: ['Platform'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const result = await app.db.controllers.BrokerClient.createClientForExpertAgent()
        reply.send(result)
    })
    app.delete('/expert-agent-creds', {
        preHandler: app.needsPermission('platform:expert-agent:creds'),
        schema: {
            summary: 'Remove expert agent credentials - admin-only',
            tags: ['Platform'],
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
        await app.db.controllers.BrokerClient.removeClientForExpertAgent()
        reply.send({ status: 'okay' })
    })

    /**
     * The ids of every team matching a search and filter.
     *
     * The team list is paginated, so an admin building an audience out of
     * hundreds of teams cannot get the whole matching set from it. This returns
     * ids only, for the same filters, in one request.
     */
    app.get('/teams/ids', {
        preHandler: app.needsPermission('team:list'),
        schema: {
            summary: 'Get the ids of all teams matching a filter - admin-only',
            tags: ['Platform', 'Teams'],
            query: {
                type: 'object',
                properties: {
                    query: { type: 'string' },
                    teamType: { type: 'string' },
                    state: { type: 'string' },
                    billing: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        count: { type: 'number' },
                        truncated: { type: 'boolean' },
                        ids: { type: 'array', items: { type: 'string' } }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const where = buildTeamFilterWhere(app, request.query)
        const result = await app.db.models.Team.getAllIds({ query: request.query.query }, where, MAX_AUDIENCE_TEAMS)
        reply.send(result)
    })

    app.post('/announcements', {
        preHandler: app.needsPermission('user:announcements:manage'),
        schema: {
            summary: 'Send platform wide announcements',
            tags: ['Platform', 'Notifications', 'Announcements'],
            body: {
                type: 'object',
                required: ['message', 'title', 'filter'],
                properties: {
                    message: { type: 'string', maxLength: 4000 },
                    title: { type: 'string', maxLength: 120 },
                    filter: {
                        type: 'object',
                        properties: {
                            roles: { type: 'array', items: { type: 'number' } },
                            teamTypes: { type: 'array', items: { type: 'string' } },
                            teams: { type: 'array', items: { type: 'string' }, maxItems: MAX_AUDIENCE_TEAMS },
                            billing: { type: 'array', items: { type: 'string' } }
                        }
                    },
                    mock: { type: 'boolean' },
                    to: { type: 'object' },
                    url: { type: 'string' },
                    format: { type: 'string', enum: ['plain', 'markdown'] },
                    video: { type: 'string', maxLength: 300 },
                    cta: {
                        type: 'object',
                        properties: {
                            label: { type: 'string', maxLength: 40 },
                            url: { type: 'string', maxLength: 500 }
                        }
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        recipientCount: { type: 'number' },
                        mock: { type: 'boolean' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const {
            title,
            message,
            filter,
            mock,
            to,
            url,
            format,
            video,
            cta
        } = request.body

        const recipientRoles = filter?.roles
        if (recipientRoles && !recipientRoles.every(value => Object.values(Roles).includes(value))) {
            return reply.code(400).send({ code: 'bad_request', error: 'Invalid Role provided.' })
        }
        let teamTypes
        if (filter?.teamTypes && filter.teamTypes.length > 0) {
            teamTypes = filter.teamTypes.map(app.db.models.TeamType.decodeHashid).flat()
        }
        let teams
        if (filter?.teams && filter.teams.length > 0) {
            const decoded = filter.teams.map(hashid => app.db.models.Team.decodeHashid(hashid)).flat()
            // decodeHashid is lenient - anything that is not a real id is rejected
            // here rather than quietly narrowing the audience to nothing.
            if (decoded.length !== filter.teams.length || decoded.some(id => !Number.isInteger(id) || id <= 0)) {
                return reply.code(400).send({ code: 'bad_request', error: 'Invalid team provided.' })
            }
            teams = decoded
        }
        let billing
        if (filter?.billing && filter.billing.length > 0) {
            billing = filter.billing
        }
        if (video && !parseVideoReference(video)) {
            return reply.code(400).send({ code: 'bad_request', error: 'Unsupported video link. Provide a YouTube URL.' })
        }
        if (cta && Object.keys(cta).length > 0 && !parseCallToAction(cta)) {
            return reply.code(400).send({ code: 'bad_request', error: 'A button needs both a label and an http(s) or relative url.' })
        }
        if (mock) {
            // If mock is sent, return an indication of how many users would receive this notification
            // without actually sending them.
            const count = await app.db.models.User.byTeamRole(recipientRoles, { teamTypes, teams, billing, summary: true, count: true })
            reply.send({
                mock: true,
                recipientCount: count
            })
            return
        }

        const recipients = await app.db.models.User.byTeamRole(recipientRoles, { teamTypes, teams, billing, summary: true })
        const notificationType = 'announcement'
        const titleSlug = title.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
        const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2)
        const reference = `${uniqueId}:${titleSlug}`
        const videoReference = parseVideoReference(video)
        const callToAction = parseCallToAction(cta)
        const data = {
            title,
            message,
            ...(format === 'markdown' && { format }),
            ...(videoReference && { video: videoReference }),
            ...(callToAction && { cta: callToAction }),
            ...(to && { to }),
            ...(url && { url })
        }
        await app.notifications.sendBulk(
            recipients,
            notificationType,
            data,
            reference
        )
        reply.send({
            recipientCount: recipients.length
        })
    })
}
