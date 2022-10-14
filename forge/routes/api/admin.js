module.exports = async function (app) {
    app.addHook('preHandler', app.verifyAdmin)

    app.get('/stats', async (request, reply) => {
        const userCount = await app.db.models.User.count({ attributes: ['admin'], group: 'admin' })
        const projectStateCounts = await app.db.models.Project.count({ attributes: ['state'], group: 'state' })
        const result = {
            userCount: 0,
            deviceCount: await app.db.models.Device.count(),
            inviteCount: await app.db.models.Invitation.count(),
            adminCount: 0,
            teamCount: await app.db.models.Team.count(),
            projectCount: 0,
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

        reply.send(result)
    })

    app.get('/license', async (request, reply) => {
        reply.send(app.license.get() || {})
    })

    app.put('/license', {
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
                const license = app.license.get()
                await app.db.controllers.AuditLog.platformLog(
                    request.session.User.id,
                    'platform.licence.apply',
                    { license }
                )
                reply.send(license || {})

            } else if (request.body.action === 'inspect') {
                const license = await app.license.inspect(request.body.license)
                await app.db.controllers.AuditLog.platformLog(
                    request.session.User.id,
                    'platform.licence.inspect',
                    { license }
                )
                reply.send(license)
            } else {
                reply.code(400).send({ code: 'invalid_license_action', error: 'Invalid action' })
            }
        } catch (err) {
            let responseMessage = err.toString()
            if (/malformed/.test(responseMessage)) {
                responseMessage = 'Failed to parse license'
            }
            await app.db.controllers.AuditLog.platformLog(
                request.session.User.id,
                'platform.licence.' + request.body.action,
                { error: responseMessage }
            )
            reply.code(400).send({ code: 'invalid_license', error: responseMessage })
        }
    })

    app.get('/invitations', async (request, reply) => {
        // TODO: Pagination
        const invitations = await app.db.models.Invitation.get()
        const result = app.db.views.Invitation.invitationList(invitations)
        reply.send({
            meta: {}, // For future pagination
            count: result.length,
            invitations: result
        })
    })

    app.get('/db-migrations', async (request, reply) => {
        reply.send((await app.db.sequelize.query('select * from "MetaVersions"'))[0])
    })
    app.get('/db-schema', async (request, reply) => {
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
        // console.log(logEntries);
        reply.send(result)
    })
}
