
module.exports = async function (app) {
    async function getStats () {
        const userCount = await app.db.models.User.count({ attributes: ['admin'], group: 'admin' })
        const projectStateCounts = await app.db.models.Project.count({ attributes: ['state'], group: 'state' })
        const license = await app.license.get() || app.license.defaults
        const result = {
            userCount: 0,
            maxUsers: license.users,
            deviceCount: await app.db.models.Device.count(),
            maxDevices: license.devices,
            inviteCount: await app.db.models.Invitation.count(),
            adminCount: 0,
            teamCount: await app.db.models.Team.count(),
            maxTeams: license.teams,
            projectCount: 0,
            maxProjects: license.projects,
            projectsByState: {}
        }
        userCount.forEach(u => {
            result.userCount += u.count
            if (u.admin === 1) {
                result.adminCount = u.count
            }
        })

        projectStateCounts.forEach(projectState => {
            result.projectCount += projectState.count
            result.projectsByState[projectState.state] = projectState.count
        })
        if (app.billing) {
            const teamStateCounts = await app.db.models.Subscription.count({ attributes: ['status'], group: 'status' })
            result.teamsByBillingState = {}
            teamStateCounts.forEach(teamState => {
                result.teamsByBillingState[teamState.status] = teamState.count
            })
        }
        return result
    }

    /**
     * Converts a JSON Object to a flattened object with key names more aligned
     * with OpemMetrics format
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
        const lines = Object.entries(result).map(m => `${m[0]} ${m[1]}`)
        return lines.join('\n') + '\n'
    }

    app.get('/stats', { preHandler: app.needsPermission('platform:stats') }, async (request, reply) => {
        const stats = await getStats()
        const acceptTypes = request.accepts().types()
        // request.accepts().type(...) can be used to check if it accepts a given type
        // A default browser request includes '*/*' which matches everything, but
        // we don't want that to match openmetrics. So we check the list of types ourselves
        if (acceptTypes.includes('application/openmetrics-text')) {
            reply.send(convertToOpenMetrics(stats))
        } else {
            reply.send(stats)
        }
    })

    app.get('/license', { preHandler: app.needsPermission('license:read') }, async (request, reply) => {
        reply.send(app.license.get() || {})
    })

    app.put('/license', {
        preHandler: app.needsPermission('license:edit'),
        schema: {
            body: {
                type: 'object',
                required: ['license', 'action'],
                properties: {
                    license: { type: 'string' },
                    action: { type: 'string' }
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

    app.get('/invitations', { preHandler: app.needsPermission('invitation:list') }, async (request, reply) => {
        // TODO: Pagination
        const invitations = await app.db.models.Invitation.get()
        const result = app.db.views.Invitation.invitationList(invitations)
        reply.send({
            meta: {}, // For future pagination
            count: result.length,
            invitations: result
        })
    })

    app.get('/debug/db-migrations', { preHandler: app.needsPermission('platform:debug') }, async (request, reply) => {
        reply.send((await app.db.sequelize.query('select * from "MetaVersions"'))[0])
    })
    app.get('/debug/db-schema', { preHandler: app.needsPermission('platform:debug') }, async (request, reply) => {
        const result = {}
        let tables
        if (app.config.db.type === 'postgres') {
            const response = await app.db.sequelize.query('select * from information_schema.tables')
            const tt = response[0]
            tables = []
            for (let i = 0; i < tt.length; i++) {
                const table = tt[i]
                if (table.table_schema === 'public') {
                    tables.push(table.table_name)
                }
            }
        } else {
            const response = await app.db.sequelize.showAllSchemas()
            tables = response.map(t => t.name)
        }
        for (let i = 0; i < tables.length; i++) {
            result[tables[i]] = await app.db.sequelize.getQueryInterface().describeTable(tables[i])
        }

        reply.send(result)
    })
    /**
     * Get platform audit logs
     * @name /api/v1/admin/audit-log
     * @memberof forge.routes.api.admin
     */
    app.get('/audit-log', { preHandler: app.needsPermission('platform:audit-log') }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const logEntries = await app.db.models.AuditLog.forPlatform(paginationOptions)
        const result = app.db.views.AuditLog.auditLog(logEntries)
        reply.send(result)
    })

    app.post('/stats-token', { preHandler: app.needsPermission('platform:stats:token') }, async (request, reply) => {
        const token = await app.db.controllers.AccessToken.generatePlatformStatisticsToken(request.session.User)
        reply.send(token)
    })
    app.delete('/stats-token', { preHandler: app.needsPermission('platform:stats:token') }, async (request, reply) => {
        await app.db.controllers.AccessToken.removePlatformStatisticsToken()
        reply.send({ status: 'okay' })
    })
}
