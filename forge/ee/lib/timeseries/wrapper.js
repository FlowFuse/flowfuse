/**
 * Driver-agnostic API for team time-series databases, used by the routes and team hooks.
 *
 * Managed servers move through provisioning → ready (or error), and can be suspended or
 * deleted. Driver calls run in the background so routes return straight away. Every change
 * to the set of ready managed servers rewrites the PgBouncer team list.
 *
 * External servers are rows only: the driver is never called for them.
 */
const { parseExternal, connectionFor, ValidationError } = require('./connection')
const connectionCheck = require('./connectionCheck')
const { generateSlug, generateManagedCredentials } = require('./credentials')
const pgbouncer = require('./pgbouncer')
const { snapshotsToDelete } = require('./snapshots')

class TimeseriesError extends Error {
    constructor (code, message, statusCode = 400) {
        super(message)
        this.code = code
        this.statusCode = statusCode
    }
}

/**
 * The major version in an image tag, or null when the tag is not a version
 * (`questdb/questdb:9.0.1` gives 9, `questdb/questdb:latest` gives null)
 */
function imageMajor (image) {
    const tag = String(image || '').split('/').pop().split('@')[0].split(':')[1]
    const match = tag?.match(/^v?(\d+)(?:\.|$)/)
    return match ? Number(match[1]) : null
}

class Timeseries {
    /**
     * @param {import('../../../forge').ForgeApplication} app
     * @param {Object} driver
     * @param {Object} config the `timeseries` section of flowforge.yml
     */
    constructor (app, driver, config) {
        this.app = app
        this.driver = driver
        this.config = config || {}
        this.options = this.config.driver?.options || {}
        this.pending = new Set()
        this.pgbouncerQueue = Promise.resolve()
    }

    async init () {
        await this.driver.init(this.app, this.options, this.config)
        this.track(this.reconcile())
    }

    async shutdown () {
        await this.settle()
        if (this.driver.shutdown) {
            await this.driver.shutdown()
        }
    }

    get M () {
        return this.app.db.models
    }

    /** Whether the driver serves one shared server to every team (static driver) */
    get shared () {
        return this.driver.shared === true
    }

    get canManage () {
        return typeof this.driver.create === 'function'
    }

    get externalEnabled () {
        return this.config.external?.enabled !== false
    }

    get tiers () {
        return this.options.tiers || {}
    }

    get defaultTier () {
        return this.options.defaultTier || Object.keys(this.tiers)[0]
    }

    /**
     * Runs a driver operation in the background, starting on the next tick so the caller's
     * response always describes the state before the operation
     */
    background (fn) {
        return this.track(new Promise(resolve => setImmediate(resolve)).then(fn))
    }

    track (promise) {
        const tracked = promise.catch(err => {
            this.app.log.error(`Timeseries background task failed: ${err.message}`)
        }).finally(() => this.pending.delete(tracked))
        this.pending.add(tracked)
        return tracked
    }

    /** Waits for every background task. Used by shutdown and tests. */
    async settle () {
        while (this.pending.size) {
            await Promise.all([...this.pending])
        }
        await this.pgbouncerQueue
    }

    async setState (database, state, stateDetail = null, extra = {}) {
        database.state = state
        database.stateDetail = stateDetail
        Object.assign(database, extra)
        await database.save()
    }

    async ensureNoDatabase (team) {
        if (await this.M.TimeseriesDatabase.byTeamId(team.id)) {
            throw new TimeseriesError('already_exists', 'The team already has a time-series database', 409)
        }
    }

    async createManaged (team, { name, tier } = {}) {
        if (!this.canManage) {
            throw new TimeseriesError('not_supported', 'This platform does not create time-series databases')
        }
        tier = tier || this.defaultTier
        if (!this.tiers[tier]) {
            throw new TimeseriesError('invalid_tier', `Unknown tier: ${tier}`)
        }
        await this.ensureNoDatabase(team)
        const slug = generateSlug()
        const database = this.M.TimeseriesDatabase.build({
            name: name || 'Time-series',
            kind: 'managed',
            state: 'provisioning',
            tier,
            image: this.options.image,
            meta: { slug },
            TeamId: team.id
        })
        database.setCredentials(generateManagedCredentials(slug))
        await database.save()
        database.Team = team
        this.background(() => this.provision(team, database))
        return database
    }

    async provision (team, database) {
        try {
            const result = await this.driver.create(team, database, {
                credentials: database.getCredentials(),
                tier: this.tiers[database.tier]
            })
            await this.setState(database, 'ready', null, {
                endpoints: result.endpoints,
                meta: { ...database.meta, ...(result.meta || {}) }
            })
            await this.syncPgbouncer()
        } catch (err) {
            this.app.log.error(`Timeseries provisioning failed for team ${team.hashid}: ${err.message}`)
            await this.setState(database, 'error', err.message)
        }
    }

    async createExternal (team, input) {
        if (!this.externalEnabled) {
            throw new TimeseriesError('not_supported', 'External time-series databases are disabled on this platform')
        }
        const { endpoints, credentials } = parseExternal(input)
        await this.ensureNoDatabase(team)
        const database = this.M.TimeseriesDatabase.build({
            name: input.name || 'Time-series',
            kind: 'external',
            state: 'ready',
            endpoints,
            meta: {},
            TeamId: team.id
        })
        database.setCredentials(credentials)
        await database.save()
        database.Team = team
        return database
    }

    async updateExternal (database, input) {
        if (database.kind !== 'external') {
            throw new TimeseriesError('invalid_request', 'Only external databases can change their connection')
        }
        const { endpoints, credentials } = parseExternal(input)
        database.endpoints = endpoints
        database.setCredentials(credentials)
        if (input.name) {
            database.name = input.name
        }
        await database.save()
        return database
    }

    ensureManagedReady (database) {
        if (database.kind !== 'managed') {
            throw new TimeseriesError('invalid_request', 'Only managed databases support this')
        }
        if (database.state !== 'ready') {
            throw new TimeseriesError('not_ready', 'The database is not ready', 409)
        }
    }

    async resize (database, tier) {
        this.ensureManagedReady(database)
        if (!this.tiers[tier]) {
            throw new TimeseriesError('invalid_tier', `Unknown tier: ${tier}`)
        }
        if (!this.driver.resize) {
            throw new TimeseriesError('not_supported', 'This platform does not resize time-series databases')
        }
        const previous = database.tier
        await this.setState(database, 'provisioning', `Resizing from ${previous} to ${tier}`)
        this.background(async () => {
            try {
                await this.driver.resize(database.Team, database, this.tiers[tier], this.tiers[previous])
                await this.setState(database, 'ready', null, { tier })
            } catch (err) {
                await this.setState(database, 'error', err.message)
            }
            await this.syncPgbouncer()
        })
        return database
    }

    async rotateCredentials (database) {
        this.ensureManagedReady(database)
        if (!this.driver.rotateCredentials) {
            throw new TimeseriesError('not_supported', 'This platform does not rotate time-series credentials')
        }
        const credentials = generateManagedCredentials(database.meta.slug)
        await this.setState(database, 'provisioning', 'Rotating credentials')
        this.background(async () => {
            try {
                await this.driver.rotateCredentials(database.Team, database, credentials)
                database.setCredentials(credentials)
                await this.setState(database, 'ready')
            } catch (err) {
                await this.setState(database, 'error', err.message)
            }
            await this.syncPgbouncer()
        })
        return database
    }

    async remove (database) {
        if (database.kind === 'external') {
            await database.destroy()
            return
        }
        await this.setState(database, 'deleting')
        await this.syncPgbouncer()
        this.background(() => this.deprovision(database))
    }

    async deprovision (database) {
        try {
            await this.driver.remove(database.Team, database)
            await database.destroy()
        } catch (err) {
            this.app.log.error(`Timeseries delete failed for ${database.hashid}: ${err.message}`)
            await this.setState(database, 'error', `Delete failed: ${err.message}`)
        }
    }

    /**
     * Stops a team's managed server and records why in `stateDetail`, so only the event that
     * suspended it can resume it.
     * @param {string} reason `team_suspended`, `trial_ended` or `feature_disabled`
     */
    async suspendTeam (team, reason = 'team_suspended') {
        const database = await this.M.TimeseriesDatabase.byTeamId(team.id)
        if (!database || database.kind !== 'managed' || database.state !== 'ready' || !this.driver.suspend) {
            return
        }
        await this.driver.suspend(team, database)
        await this.setState(database, 'suspended', reason)
        await this.syncPgbouncer()
        await this.app.auditLog.Team.timeseries.database.suspended(null, null, team, database, reason)
    }

    /**
     * Starts a suspended server again. With a reason, only a server suspended for that reason
     * is resumed.
     */
    async resumeTeam (team, reason) {
        const database = await this.M.TimeseriesDatabase.byTeamId(team.id)
        if (!database || database.kind !== 'managed' || database.state !== 'suspended' || !this.driver.resume) {
            return
        }
        if (reason && database.stateDetail !== reason) {
            return
        }
        if (reason !== 'feature_disabled' && !await this.featureEnabled(team)) {
            // The team type lost the feature while the server was suspended for another reason
            await this.setState(database, 'suspended', 'feature_disabled')
            return
        }
        await this.driver.resume(team, database)
        await this.setState(database, 'ready')
        await this.syncPgbouncer()
        await this.app.auditLog.Team.timeseries.database.resumed(null, null, team, database, reason || database.stateDetail)
    }

    async featureEnabled (team) {
        await team.ensureTeamTypeExists()
        return !!team.getFeatureProperty('timeseries', false)
    }

    /** Suspends the team's server when its team type no longer has the feature, and resumes it when it does again */
    async syncFeature (team) {
        if (await this.featureEnabled(team)) {
            await this.resumeTeam(team, 'feature_disabled')
        } else {
            await this.suspendTeam(team, 'feature_disabled')
        }
    }

    /**
     * Lets a team owner start a server that was suspended when the trial ended. The caller
     * has checked that the team is not suspended.
     */
    async resumeAfterTrial (database) {
        if (database.kind !== 'managed' || database.state !== 'suspended' || database.stateDetail !== 'trial_ended') {
            throw new TimeseriesError('not_resumable', 'The database was not suspended by the end of a trial', 409)
        }
        if (!this.driver.resume) {
            throw new TimeseriesError('not_supported', 'This platform does not resume time-series databases')
        }
        await this.setState(database, 'provisioning', 'Resuming')
        this.background(async () => {
            try {
                await this.driver.resume(database.Team, database)
                await this.setState(database, 'ready')
            } catch (err) {
                await this.setState(database, 'error', err.message)
            }
            await this.syncPgbouncer()
        })
        return database
    }

    /**
     * Moves a managed server to another image on the same data. Other major versions need
     * `force`, since the data on disk can't be read back by an older major version.
     */
    async upgrade (database, image, { force } = {}) {
        this.ensureManagedReady(database)
        if (!this.driver.upgrade) {
            throw new TimeseriesError('not_supported', 'This platform does not upgrade time-series databases')
        }
        image = image || this.options.image
        if (!image) {
            throw new TimeseriesError('invalid_request', 'No image given and no default image configured')
        }
        const previous = database.image || this.options.image
        const from = imageMajor(previous)
        const to = imageMajor(image)
        if (force !== true && (from === null || to === null || from !== to)) {
            throw new TimeseriesError('major_upgrade', `Upgrading from ${previous} to ${image} may change the major version, which needs a backup first. Repeat with force to continue`, 409)
        }
        await this.setState(database, 'provisioning', `Upgrading to ${image}`)
        this.background(async () => {
            try {
                await this.driver.upgrade(database.Team, database, image)
                await this.setState(database, 'ready', null, { image })
            } catch (err) {
                await this.setState(database, 'error', err.message)
            }
            await this.syncPgbouncer()
        })
        return database
    }

    get backupsEnabled () {
        return this.options.snapshots?.enabled === true && typeof this.driver.backup === 'function'
    }

    /** Snapshots every ready managed server and prunes old snapshots. One team failing does not stop the others. */
    async backupAll () {
        if (!this.backupsEnabled) {
            return
        }
        const databases = await this.M.TimeseriesDatabase.readyManaged()
        for (const database of databases) {
            try {
                const team = database.Team || await this.M.Team.byId(database.TeamId)
                await this.driver.backup(team, database, database.getCredentials())
                if (this.driver.listSnapshots) {
                    const snapshots = await this.driver.listSnapshots(team, database)
                    const names = snapshotsToDelete(snapshots, this.options.snapshots.retention, new Date())
                    for (const name of names) {
                        await this.driver.deleteSnapshot(team, database, name)
                    }
                }
            } catch (err) {
                this.app.log.error(`Timeseries backup failed for ${database.hashid}: ${err.message}`)
            }
        }
    }

    /**
     * What the config endpoint returns to a team's instances and devices
     * @param {Object} team
     * @param {'internal'|'external'} audience
     */
    async connectionForTeam (team, audience) {
        const database = await this.M.TimeseriesDatabase.byTeamId(team.id)
        if (database) {
            if (database.state !== 'ready') {
                return { available: false, state: database.state }
            }
            return { available: true, ...connectionFor(database, audience, this.config) }
        }
        if (this.shared) {
            return { available: true, ...this.driver.sharedConnection(audience) }
        }
        return { available: false }
    }

    /** Connection details shown to team owners: what a device would use */
    connectionForOwner (database) {
        return connectionFor(database, 'external', this.config)
    }

    async check (input) {
        let connection
        try {
            const { endpoints, credentials } = parseExternal(input)
            connection = {
                ilp: { ...endpoints.ilp, ...credentials.ilp },
                pgwire: { ...endpoints.pgwire, ...credentials.pgwire }
            }
        } catch (err) {
            if (err instanceof ValidationError) {
                throw new TimeseriesError('invalid_request', err.message)
            }
            throw err
        }
        return connectionCheck.check(connection, {
            allowPrivateNetworks: this.config.external?.allowPrivateNetworks === true
        })
    }

    /**
     * Rewrites the PgBouncer team list from the ready managed servers. Calls are queued so two
     * changes never write at the same time.
     */
    syncPgbouncer () {
        if (!this.driver.writePgbouncer || !this.config.pgbouncer) {
            return Promise.resolve()
        }
        this.pgbouncerQueue = this.pgbouncerQueue.then(async () => {
            const databases = await this.M.TimeseriesDatabase.readyManaged()
            const servers = databases.map(database => {
                const credentials = database.getCredentials()
                return {
                    database: database.meta.slug,
                    host: database.endpoints.internal.host,
                    port: database.endpoints.internal.pgPort ?? 8812,
                    user: credentials.pgUser,
                    password: credentials.pgPassword
                }
            })
            const files = pgbouncer.render(servers, { maxConnectionsPerTeam: this.config.pgbouncer.maxConnectionsPerTeam })
            await this.driver.writePgbouncer(files)
        }).catch(err => {
            this.app.log.error(`Timeseries PgBouncer sync failed: ${err.message}`)
        })
        return this.pgbouncerQueue
    }

    /**
     * After a restart: finish operations a previous forge left half done, recreate managed
     * servers whose container or pod has gone, and rewrite the PgBouncer team list.
     */
    async reconcile () {
        if (!this.canManage) {
            return
        }
        const databases = await this.M.TimeseriesDatabase.findAll({
            where: { kind: 'managed' },
            include: [{ model: this.M.Team }]
        })
        for (const database of databases) {
            if (database.state === 'provisioning') {
                await this.provision(database.Team, database)
            } else if (database.state === 'deleting') {
                await this.deprovision(database)
            } else if (database.state === 'ready' && this.driver.status) {
                const status = await this.driver.status(database.Team, database).catch(() => 'unknown')
                if (status === 'missing') {
                    this.app.log.warn(`Timeseries server for team ${database.Team.hashid} is missing, recreating it`)
                    await this.setState(database, 'provisioning', 'Recreating after restart')
                    await this.provision(database.Team, database)
                }
            }
        }
        for (const database of databases) {
            try {
                await this.syncFeature(database.Team)
            } catch (err) {
                this.app.log.error(`Timeseries feature check failed for team ${database.Team.hashid}: ${err.message}`)
            }
        }
        await this.logOrphans(databases)
        await this.syncPgbouncer()
    }

    /** Servers that exist without a row are only reported: their volumes may hold customer data */
    async logOrphans (databases) {
        if (!this.driver.list) {
            return
        }
        try {
            const known = new Set(databases.map(database => database.meta?.slug))
            for (const slug of await this.driver.list()) {
                if (!known.has(slug)) {
                    this.app.log.warn(`Timeseries server ${slug} has no database row, leaving it in place`)
                }
            }
        } catch (err) {
            this.app.log.error(`Timeseries orphan check failed: ${err.message}`)
        }
    }
}

module.exports = {
    Timeseries,
    imageMajor,
    TimeseriesError
}
