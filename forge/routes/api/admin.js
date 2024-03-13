const { Op } = require('sequelize')

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
        userCount.forEach(u => {
            result.userCount += u.count
            if (u.admin === 1) {
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
            const formattedKey = `${rootKey}${key}`.replace(/[A-Z]/g, m => {
                return '_' + m.toLowerCase()
            })
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
}
