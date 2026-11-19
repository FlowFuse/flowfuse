/**
 * Team time-series database
 *
 * A team has at most one QuestDB server: managed (created by the platform's driver) or
 * external (run by the customer, connected here by a team owner).
 *
 * @namespace timeseries
 * @memberof forge.ee.routes
 */
const { TimeseriesError } = require('../../lib/timeseries/wrapper')

const connectionInput = {
    type: 'object',
    properties: {
        ilp: {
            type: 'object',
            properties: {
                protocol: { type: 'string', enum: ['http', 'https'] },
                host: { type: 'string' },
                port: { type: 'number' },
                authType: { type: 'string', enum: ['none', 'basic', 'bearer'] },
                username: { type: 'string' },
                password: { type: 'string' },
                token: { type: 'string' },
                tlsVerify: { type: 'boolean' },
                tlsCa: { type: 'string' },
                protocolVersion: { type: 'string' }
            },
            required: ['protocol', 'host'],
            additionalProperties: false
        },
        pgwire: {
            type: 'object',
            properties: {
                host: { type: 'string' },
                port: { type: 'number' },
                database: { type: 'string' },
                user: { type: 'string' },
                password: { type: 'string' },
                ssl: { type: 'boolean' },
                sslVerify: { type: 'boolean' },
                ca: { type: 'string' }
            },
            required: ['host', 'user'],
            additionalProperties: false
        }
    }
}

module.exports = async function (app) {
    // All routes are relative to /api/v1/teams/:teamId/timeseries

    app.addHook('preHandler', async (request, reply) => {
        if (!app.timeseries) {
            return reply.status(404).send({ code: 'not_found', error: 'Not Found - time-series databases are not configured' })
        }
        if (!request.team) {
            request.team = await app.db.models.Team.byId(request.params.teamId)
            if (!request.team) {
                return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
        await request.team.ensureTeamTypeExists()
        if (!request.team.getFeatureProperty('timeseries', false)) {
            return reply.status(404).send({ code: 'not_found', error: 'Not Found - the time-series database is not enabled for this team' })
        }
        if (!request.teamMembership && request.session?.User) {
            request.teamMembership = await request.session.User.getTeamMembership(request.team.id)
        }
        if (request.params.databaseId !== undefined) {
            request.timeseriesDatabase = await app.db.models.TimeseriesDatabase.byId(request.team.id, request.params.databaseId)
            if (!request.timeseriesDatabase) {
                return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    })

    app.setErrorHandler((err, request, reply) => {
        if (err instanceof TimeseriesError || err.code === 'invalid_request') {
            return reply.status(err.statusCode || 400).send({ code: err.code, error: err.message })
        }
        if (err.validation) {
            return reply.status(400).send({ code: 'invalid_request', error: err.message })
        }
        app.log.error(err)
        reply.status(500).send({ code: 'unexpected_error', error: 'Unexpected error' })
    })

    function canSeeConnection (request) {
        return app.hasPermission(request.teamMembership, 'team:timeseries:create') || request.session.User?.admin
    }

    /**
     * What the team can do on this platform, for the UI
     * @name /api/v1/teams/:teamId/timeseries
     */
    app.get('/', {
        preHandler: app.needsPermission('team:timeseries:list'),
        schema: {
            summary: 'Get the team time-series database',
            tags: ['Timeseries'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        databases: { type: 'array', items: { $ref: 'TimeseriesDatabaseSummary' } },
                        platform: {
                            type: 'object',
                            properties: {
                                managed: { type: 'boolean' },
                                external: { type: 'boolean' },
                                shared: { type: 'boolean' },
                                tiers: { type: 'array', items: { type: 'string' } },
                                defaultTier: { type: 'string', nullable: true }
                            }
                        }
                    }
                },
                '4xx': { $ref: 'APIError' }
            }
        }
    }, async (request, reply) => {
        const database = await app.db.models.TimeseriesDatabase.byTeamId(request.team.id)
        reply.send({
            databases: database ? [app.db.views.TimeseriesDatabase.summary(database)] : [],
            platform: {
                managed: app.timeseries.canManage,
                external: app.timeseries.externalEnabled,
                shared: app.timeseries.shared,
                tiers: Object.keys(app.timeseries.tiers),
                defaultTier: app.timeseries.defaultTier ?? null
            }
        })
    })

    /**
     * Create a managed server, or connect an external one with `kind: 'external'`
     * @name /api/v1/teams/:teamId/timeseries
     */
    app.post('/', {
        preHandler: app.needsPermission('team:timeseries:create'),
        schema: {
            summary: 'Create or connect the team time-series database',
            tags: ['Timeseries'],
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string', maxLength: 100 },
                    kind: { type: 'string', enum: ['managed', 'external'] },
                    tier: { type: 'string' },
                    ilp: connectionInput.properties.ilp,
                    pgwire: connectionInput.properties.pgwire,
                    check: { type: 'boolean' }
                },
                additionalProperties: false
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        database: { $ref: 'TimeseriesDatabaseSummary' },
                        check: { type: 'object', additionalProperties: true }
                    }
                },
                202: {
                    type: 'object',
                    properties: {
                        database: { $ref: 'TimeseriesDatabaseSummary' }
                    }
                },
                '4xx': { $ref: 'APIError' }
            }
        }
    }, async (request, reply) => {
        const kind = request.body.kind || 'managed'
        let database
        try {
            if (kind === 'external') {
                const check = request.body.check === false ? undefined : await app.timeseries.check(request.body)
                database = await app.timeseries.createExternal(request.team, request.body)
                await app.auditLog.Team.timeseries.database.created(request.session.User, null, request.team, database)
                return reply.status(201).send({ database: app.db.views.TimeseriesDatabase.summary(database), check })
            }
            database = await app.timeseries.createManaged(request.team, request.body)
        } catch (err) {
            await app.auditLog.Team.timeseries.database.created(request.session.User, err, request.team, { name: request.body.name || 'Time-series' })
            throw err
        }
        // Provisioning carries on in the background, so take the summary before it moves on
        const summary = app.db.views.TimeseriesDatabase.summary(database)
        await app.auditLog.Team.timeseries.database.created(request.session.User, null, request.team, database)
        reply.status(202).send({ database: summary })
    })

    /**
     * Check external server details without saving them
     * @name /api/v1/teams/:teamId/timeseries/check
     */
    app.post('/check', {
        preHandler: app.needsPermission('team:timeseries:create'),
        config: {
            rateLimit: app.config.rate_limits ? { max: 10, timeWindow: 60000 } : false
        },
        schema: {
            summary: 'Check that the platform can reach an external QuestDB server',
            tags: ['Timeseries'],
            body: connectionInput,
            response: {
                200: { type: 'object', additionalProperties: true },
                '4xx': { $ref: 'APIError' }
            }
        }
    }, async (request, reply) => {
        reply.send(await app.timeseries.check(request.body))
    })

    /**
     * Team owners also get the connection details a device would use
     * @name /api/v1/teams/:teamId/timeseries/:databaseId
     */
    app.get('/:databaseId', {
        preHandler: app.needsPermission('team:timeseries:list'),
        schema: {
            summary: 'Get the team time-series database',
            tags: ['Timeseries'],
            response: {
                200: {
                    anyOf: [
                        { $ref: 'TimeseriesDatabaseConnection' },
                        { $ref: 'TimeseriesDatabaseSummary' }
                    ]
                },
                '4xx': { $ref: 'APIError' }
            }
        }
    }, async (request, reply) => {
        const database = request.timeseriesDatabase
        if (canSeeConnection(request) && database.state === 'ready') {
            return reply.send(app.db.views.TimeseriesDatabase.connection(database, app.timeseries.connectionForOwner(database)))
        }
        reply.send(app.db.views.TimeseriesDatabase.summary(database))
    })

    /**
     * Managed: change tier. External: change name or connection details.
     * @name /api/v1/teams/:teamId/timeseries/:databaseId
     */
    app.put('/:databaseId', {
        preHandler: app.needsPermission('team:timeseries:edit'),
        schema: {
            summary: 'Update the team time-series database',
            tags: ['Timeseries'],
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string', maxLength: 100 },
                    tier: { type: 'string' },
                    ilp: connectionInput.properties.ilp,
                    pgwire: connectionInput.properties.pgwire
                },
                additionalProperties: false
            },
            response: {
                200: { $ref: 'TimeseriesDatabaseSummary' },
                202: { $ref: 'TimeseriesDatabaseSummary' },
                '4xx': { $ref: 'APIError' }
            }
        }
    }, async (request, reply) => {
        const database = request.timeseriesDatabase
        const updates = new app.auditLog.formatters.UpdatesCollection()
        let status = 200
        let summary
        if (database.kind === 'external' && (request.body.ilp || request.body.pgwire)) {
            await app.timeseries.updateExternal(database, request.body)
            updates.push('connection', 'hidden', 'changed')
        } else if (request.body.tier && request.body.tier !== database.tier) {
            const previous = database.tier
            await app.timeseries.resize(database, request.body.tier)
            summary = app.db.views.TimeseriesDatabase.summary(database)
            updates.push('tier', previous, request.body.tier)
            status = 202
        }
        if (request.body.name && request.body.name !== database.name) {
            updates.push('name', database.name, request.body.name)
            database.name = request.body.name
            await database.save()
        }
        summary = summary ? { ...summary, name: database.name } : app.db.views.TimeseriesDatabase.summary(database)
        if (updates.length) {
            await app.auditLog.Team.timeseries.database.updated(request.session.User, null, request.team, database, updates)
        }
        reply.status(status).send(summary)
    })

    /**
     * @name /api/v1/teams/:teamId/timeseries/:databaseId/rotate-credentials
     */
    app.post('/:databaseId/rotate-credentials', {
        preHandler: app.needsPermission('team:timeseries:edit'),
        schema: {
            summary: 'Generate new credentials for the managed time-series database',
            tags: ['Timeseries'],
            response: {
                202: { $ref: 'TimeseriesDatabaseSummary' },
                '4xx': { $ref: 'APIError' }
            }
        }
    }, async (request, reply) => {
        const database = await app.timeseries.rotateCredentials(request.timeseriesDatabase)
        const summary = app.db.views.TimeseriesDatabase.summary(database)
        await app.auditLog.Team.timeseries.database.credentialsRotated(request.session.User, null, request.team, database)
        reply.status(202).send(summary)
    })

    /**
     * Managed servers are deleted with their data. External servers are only disconnected.
     * @name /api/v1/teams/:teamId/timeseries/:databaseId
     */
    app.delete('/:databaseId', {
        preHandler: app.needsPermission('team:timeseries:delete'),
        schema: {
            summary: 'Delete the managed time-series database, or disconnect the external one',
            tags: ['Timeseries'],
            response: {
                200: { $ref: 'APIStatus' },
                202: { $ref: 'APIStatus' },
                '4xx': { $ref: 'APIError' }
            }
        }
    }, async (request, reply) => {
        const database = request.timeseriesDatabase
        const managed = database.kind === 'managed'
        await app.timeseries.remove(database)
        await app.auditLog.Team.timeseries.database.deleted(request.session.User, null, request.team, database)
        reply.status(managed ? 202 : 200).send({ status: 'okay' })
    })
}
