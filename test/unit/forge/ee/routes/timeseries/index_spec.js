const should = require('should')

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const stubDriver = FF_UTIL.require('forge/ee/lib/timeseries/drivers/stub.js')

const externalServer = {
    kind: 'external',
    name: 'Plant historian',
    check: false,
    ilp: { protocol: 'https', host: 'questdb.customer.example', port: 9000, authType: 'basic', username: 'writer', password: 'w-secret' },
    pgwire: { host: 'questdb.customer.example', port: 8812, database: 'qdb', user: 'reader', password: 'r-secret', ssl: true }
}

describe('Timeseries API', function () {
    let app
    const TestObjects = { tokens: {} }

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        TestObjects.tokens[username] = response.cookies[0].value
    }

    async function enableFeature (enabled) {
        // A new object, so Sequelize sees the change
        const properties = JSON.parse(JSON.stringify(app.defaultTeamType.properties))
        properties.features = { ...(properties.features || {}), timeseries: enabled }
        // enableAllFeatures would override the feature flag
        properties.enableAllFeatures = false
        app.defaultTeamType.properties = properties
        await app.defaultTeamType.save()
    }

    function inject (method, path, user, payload) {
        return app.inject({
            method,
            url: `/api/v1/teams/${TestObjects.team.hashid}/timeseries${path}`,
            cookies: { sid: TestObjects.tokens[user] },
            payload
        })
    }

    async function getConfig (token) {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/timeseries/config',
            headers: { Authorization: `Bearer ${token}` }
        })
        return response
    }

    async function removeAll () {
        await app.timeseries.settle()
        await app.db.models.TimeseriesDatabase.destroy({ where: {} })
        await app.timeseries.syncPgbouncer()
    }

    before(async function () {
        app = await setup({
            timeseries: {
                enabled: true,
                driver: {
                    type: 'stub',
                    options: {
                        defaultTier: 'small',
                        tiers: {
                            small: { cpu: '1', memory: '2Gi', storage: '20Gi' },
                            medium: { cpu: '2', memory: '8Gi', storage: '100Gi' }
                        }
                    }
                },
                pgbouncer: { host: 'ts.example.com', port: 5432, ssl: true, maxConnectionsPerTeam: 10 }
            }
        })
        TestObjects.team = app.team
        TestObjects.device = await app.factory.createDevice({ name: 'device1' }, app.team)

        await login('alice', 'aaPassword')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        await app.team.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await login('bob', 'bbPassword')
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
        await app.team.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await login('chris', 'ccPassword')

        await enableFeature(true)
        TestObjects.instanceToken = (await app.instance.refreshAuthTokens()).token
        TestObjects.deviceToken = (await app.db.controllers.AccessToken.createTokenForDevice(TestObjects.device)).token
    })

    after(async function () {
        await app.close()
    })

    afterEach(async function () {
        await removeAll()
        stubDriver.state.options.fail = false
        await enableFeature(true)
    })

    describe('team routes', function () {
        it('returns no database and what the platform supports', async function () {
            const response = await inject('GET', '', 'chris')
            response.statusCode.should.equal(200)
            const body = response.json()
            body.databases.should.have.length(0)
            body.platform.should.match({ managed: true, external: true, shared: false, tiers: ['small', 'medium'], defaultTier: 'small' })
        })

        it('returns 404 when the team type does not include the feature', async function () {
            await enableFeature(false)
            const response = await inject('GET', '', 'bob')
            response.statusCode.should.equal(404)
        })

        it('lets an owner create a managed server, which becomes ready in the background', async function () {
            const response = await inject('POST', '', 'bob', { name: 'Sensors' })
            response.statusCode.should.equal(202)
            const { database } = response.json()
            database.should.match({ name: 'Sensors', kind: 'managed', state: 'provisioning', tier: 'small' })

            await app.timeseries.settle()
            const list = (await inject('GET', '', 'chris')).json()
            list.databases[0].should.match({ id: database.id, state: 'ready' })

            const row = await app.db.models.TimeseriesDatabase.byTeamId(TestObjects.team.id)
            row.credentials.should.not.match(/t_/)
            row.getCredentials().pgUser.should.equal(`t_${row.meta.slug}`)
            row.meta.slug.should.match(/^[a-z][a-z0-9]{11}$/)
        })

        it('logs the creation in the team audit log', async function () {
            await inject('POST', '', 'bob', { name: 'Audited' })
            const entry = await app.db.models.AuditLog.findOne({ where: { event: 'team.timeseries.created', entityId: String(TestObjects.team.id) }, order: [['id', 'DESC']] })
            should.exist(entry)
            JSON.parse(entry.body).database.should.eql({ name: 'Audited' })
        })

        it('does not let a member create a server', async function () {
            const response = await inject('POST', '', 'chris', {})
            response.statusCode.should.equal(403)
        })

        it('refuses a second database for the same team', async function () {
            await inject('POST', '', 'bob', {})
            const response = await inject('POST', '', 'bob', externalServer)
            response.statusCode.should.equal(409)
            response.json().code.should.equal('already_exists')
        })

        it('refuses an unknown tier', async function () {
            const response = await inject('POST', '', 'bob', { tier: 'huge' })
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_tier')
        })

        it('marks the server as errored when the driver fails', async function () {
            stubDriver.state.options.fail = true
            await inject('POST', '', 'bob', {})
            await app.timeseries.settle()
            const list = (await inject('GET', '', 'bob')).json()
            list.databases[0].should.match({ state: 'error', stateDetail: 'stub create failure' })
        })

        it('shows connection details to owners only', async function () {
            const { database } = (await inject('POST', '', 'bob', {})).json()
            await app.timeseries.settle()

            const owner = (await inject('GET', `/${database.id}`, 'bob')).json()
            owner.connection.pgwire.should.match({ host: 'ts.example.com', port: 5432, ssl: true })
            owner.connection.ilp.should.match({ protocol: 'https', authType: 'basic' })

            const member = (await inject('GET', `/${database.id}`, 'chris')).json()
            should.not.exist(member.connection)
        })

        it('deletes a managed server in the background', async function () {
            const { database } = (await inject('POST', '', 'bob', {})).json()
            await app.timeseries.settle()
            const response = await inject('DELETE', `/${database.id}`, 'bob')
            response.statusCode.should.equal(202)
            await app.timeseries.settle()
            should.not.exist(await app.db.models.TimeseriesDatabase.byTeamId(TestObjects.team.id))
            stubDriver.state.calls.map(call => call[0]).should.containEql('remove')
        })

        it('resizes and rotates credentials of a managed server', async function () {
            const { database } = (await inject('POST', '', 'bob', {})).json()
            await app.timeseries.settle()
            const before = (await app.db.models.TimeseriesDatabase.byTeamId(TestObjects.team.id)).getCredentials()

            const resized = await inject('PUT', `/${database.id}`, 'bob', { tier: 'medium' })
            resized.statusCode.should.equal(202)
            await app.timeseries.settle()
            const rotated = await inject('POST', `/${database.id}/rotate-credentials`, 'bob')
            rotated.statusCode.should.equal(202)
            await app.timeseries.settle()

            const row = await app.db.models.TimeseriesDatabase.byTeamId(TestObjects.team.id)
            row.tier.should.equal('medium')
            row.state.should.equal('ready')
            row.getCredentials().pgPassword.should.not.equal(before.pgPassword)
            row.getCredentials().pgUser.should.equal(before.pgUser)
        })

        it('connects an external server without calling the driver', async function () {
            const callsBefore = stubDriver.state.calls.length
            const response = await inject('POST', '', 'bob', externalServer)
            response.statusCode.should.equal(201)
            response.json().database.should.match({ name: 'Plant historian', kind: 'external', state: 'ready' })
            stubDriver.state.calls.should.have.length(callsBefore)
        })

        it('validates external server details', async function () {
            const response = await inject('POST', '', 'bob', {
                ...externalServer,
                pgwire: { ...externalServer.pgwire, host: 'bad host; DROP' }
            })
            response.statusCode.should.equal(400)
            response.json().error.should.match(/pgwire.host/)
        })

        it('changes the connection of an external server and disconnects it', async function () {
            const { database } = (await inject('POST', '', 'bob', externalServer)).json()
            const updated = await inject('PUT', `/${database.id}`, 'bob', {
                ilp: { ...externalServer.ilp, host: 'new.customer.example' },
                pgwire: externalServer.pgwire
            })
            updated.statusCode.should.equal(200)
            const owner = (await inject('GET', `/${database.id}`, 'bob')).json()
            owner.connection.ilp.host.should.equal('new.customer.example')

            const removed = await inject('DELETE', `/${database.id}`, 'bob')
            removed.statusCode.should.equal(200)
            should.not.exist(await app.db.models.TimeseriesDatabase.byTeamId(TestObjects.team.id))
        })

        it('refuses a connection check against a private address', async function () {
            const response = await inject('POST', '/check', 'bob', {
                ilp: { protocol: 'http', host: '127.0.0.1', port: 9000 },
                pgwire: { host: '169.254.169.254', port: 8812, user: 'x' }
            })
            response.statusCode.should.equal(200)
            response.json().should.match({
                ilp: { ok: false, error: 'private_address_not_allowed' },
                pgwire: { ok: false, error: 'private_address_not_allowed' }
            })
        })

        it('blocks deleting a team that owns a managed server', async function () {
            const team = await app.factory.createTeam({ name: 'Doomed' })
            await app.timeseries.createManaged(team, {})
            await app.timeseries.settle()
            await team.destroy().should.be.rejectedWith(/time-series database/)
        })
    })

    describe('PgBouncer team list', function () {
        it('lists ready managed servers only, and drops deleted ones', async function () {
            const { database } = (await inject('POST', '', 'bob', {})).json()
            await app.timeseries.settle()
            const row = await app.db.models.TimeseriesDatabase.byTeamId(TestObjects.team.id)
            const { slug } = row.meta
            stubDriver.state.pgbouncer.databases.should.match(new RegExp(`^${slug} = host=ts-${slug} port=8812 dbname=qdb max_db_connections=10$`, 'm'))
            stubDriver.state.pgbouncer.userlist.should.containEql(`"t_${slug}"`)

            await inject('DELETE', `/${database.id}`, 'bob')
            await app.timeseries.settle()
            stubDriver.state.pgbouncer.databases.should.equal('[databases]\n')
        })

        it('never lists external servers', async function () {
            await inject('POST', '', 'bob', externalServer)
            await app.timeseries.syncPgbouncer()
            stubDriver.state.pgbouncer.userlist.should.equal('')
        })

        it('drops suspended servers and lists them again on resume', async function () {
            await inject('POST', '', 'bob', {})
            await app.timeseries.settle()
            await app.timeseries.suspendTeam(TestObjects.team)
            stubDriver.state.pgbouncer.userlist.should.equal('')
            await app.timeseries.resumeTeam(TestObjects.team)
            stubDriver.state.pgbouncer.userlist.should.not.equal('')
        })
    })

    describe('config endpoint', function () {
        it('gives a hosted instance the internal endpoints of a managed server', async function () {
            await inject('POST', '', 'bob', {})
            await app.timeseries.settle()
            const row = await app.db.models.TimeseriesDatabase.byTeamId(TestObjects.team.id)
            const response = await getConfig(TestObjects.instanceToken)
            response.statusCode.should.equal(200)
            response.json().should.match({
                available: true,
                ilp: { protocol: 'http', host: `ts-${row.meta.slug}`, port: 9000, authType: 'basic', username: `t_${row.meta.slug}` },
                pgwire: { host: `ts-${row.meta.slug}`, port: 8812, database: 'qdb', ssl: false }
            })
        })

        it('gives a device the external ILP endpoint and PgBouncer', async function () {
            await inject('POST', '', 'bob', {})
            await app.timeseries.settle()
            const row = await app.db.models.TimeseriesDatabase.byTeamId(TestObjects.team.id)
            const response = await getConfig(TestObjects.deviceToken)
            response.json().should.match({
                available: true,
                ilp: { protocol: 'https', host: `${row.meta.slug}.ts.example.com`, port: 443 },
                pgwire: { host: 'ts.example.com', port: 5432, database: row.meta.slug, user: `t_${row.meta.slug}`, ssl: true }
            })
        })

        it('gives instances and devices the external server as entered', async function () {
            await inject('POST', '', 'bob', externalServer)
            for (const token of [TestObjects.instanceToken, TestObjects.deviceToken]) {
                const body = (await getConfig(token)).json()
                body.should.match({
                    available: true,
                    ilp: { protocol: 'https', host: 'questdb.customer.example', username: 'writer', password: 'w-secret' },
                    pgwire: { host: 'questdb.customer.example', user: 'reader', password: 'r-secret', ssl: true }
                })
            }
        })

        it('reports a server that is not ready yet', async function () {
            stubDriver.state.options.fail = true
            await inject('POST', '', 'bob', {})
            await app.timeseries.settle()
            const body = (await getConfig(TestObjects.instanceToken)).json()
            body.should.eql({ available: false, state: 'error' })
        })

        it('reports nothing available without a database', async function () {
            const body = (await getConfig(TestObjects.instanceToken)).json()
            body.should.eql({ available: false })
        })

        it('reports nothing available when the team type lacks the feature', async function () {
            await inject('POST', '', 'bob', externalServer)
            await enableFeature(false)
            const body = (await getConfig(TestObjects.deviceToken)).json()
            body.should.eql({ available: false })
        })

        it('refuses browser sessions, which would otherwise read credentials', async function () {
            await inject('POST', '', 'bob', externalServer)
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/timeseries/config',
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })
    })
})

describe('Timeseries API with the static driver', function () {
    let app

    before(async function () {
        app = await setup({
            timeseries: {
                enabled: true,
                questdb: {
                    ilp: { protocol: 'http', host: 'questdb', port: 9000 },
                    pgwire: { host: 'questdb', port: 8812, user: 'admin', password: 'quest' },
                    external: { pgwire: { host: 'questdb.example.com', ssl: true } }
                }
            }
        })
        const properties = app.defaultTeamType.properties
        properties.features = { ...(properties.features || {}), timeseries: true }
        app.defaultTeamType.properties = properties
        await app.defaultTeamType.save()
    })

    after(async function () {
        await app.close()
    })

    it('reads the legacy timeseries.questdb block as the static driver', async function () {
        app.timeseries.shared.should.be.true()
        app.timeseries.canManage.should.be.false()
    })

    it('gives every team the shared server, with external overrides for devices', async function () {
        const instanceToken = (await app.instance.refreshAuthTokens()).token
        const device = await app.factory.createDevice({ name: 'd' }, app.team)
        const deviceToken = (await app.db.controllers.AccessToken.createTokenForDevice(device)).token

        const internal = (await app.inject({ method: 'GET', url: '/api/v1/timeseries/config', headers: { Authorization: `Bearer ${instanceToken}` } })).json()
        internal.should.match({ available: true, pgwire: { host: 'questdb', ssl: false } })

        const external = (await app.inject({ method: 'GET', url: '/api/v1/timeseries/config', headers: { Authorization: `Bearer ${deviceToken}` } })).json()
        external.should.match({ available: true, pgwire: { host: 'questdb.example.com', ssl: true, user: 'admin' } })
    })

    it('refuses to create a managed server', async function () {
        await app.timeseries.createManaged(app.team, {}).should.be.rejectedWith({ code: 'not_supported' })
    })
})
