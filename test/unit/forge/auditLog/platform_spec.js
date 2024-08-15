const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
// Declare a dummy getLoggers function for type hint only
/** @type {import('../../../../forge/auditLog/platform').getLoggers} */
const getLoggers = (app) => { return {} }

describe.only('Audit Log > Platform', async function () {
    let app
    let ACTIONED_BY
    let STACK, PROJECTTYPE

    // temporarily assign the logger purely for type info & intellisense
    // so that xxxxxLogger.yyy.zzz function parameters are offered
    // The real logger is assigned in the before() function
    let platformLogger = getLoggers(null)

    before(async () => {
        app = await FF_UTIL.setupApp()
        // get Platform scope logger
        platformLogger = app.auditLog.Platform

        ACTIONED_BY = await app.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })
        STACK = await app.db.models.ProjectStack.create({
            name: 'stack1',
            active: true,
            properties: { nodered: '2.2.2' }
        })
        PROJECTTYPE = await app.db.models.ProjectType.create({
            name: 'projectType1',
            description: 'default project type',
            active: true,
            properties: { foo: 'bar' },
            order: 1
        })
    })
    after(async () => {
        await app.close()
    })
    beforeEach(async function () {
        await app.db.models.AuditLog.destroy({ truncate: true })
    })

    async function getLog () {
        const logs = await app.db.models.AuditLog.forEntity()
        logs.log.should.have.length(1)
        return (await app.db.views.AuditLog.auditLog({ log: logs.log })).log[0]
    }

    // #region Common Tests

    it('Permits a logger to be triggered by system user id', async function () {
        // call any function to trigger the logger with a system user id
        await platformLogger.platform.stack.created(0, null, STACK)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('trigger', { id: 'system', type: 'system', name: 'FlowFuse Platform' })
        logEntry.should.have.property('body').and.be.an.Object()
        logEntry.body.should.not.have.property('trigger')
    })

    // #endregion

    it('Provides a logger for platform settings', async function () {
        await platformLogger.platform.settings.updated(ACTIONED_BY, null, [{}])

        const logEntry = await getLog()
        logEntry.should.have.property('event', 'platform.settings.updated')
        logEntry.should.have.property('scope', { id: null, type: 'platform' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
    })

    it('Provides a logger for creating platform stacks', async function () {
        // platform - stack - created
        await platformLogger.platform.stack.created(ACTIONED_BY, null, STACK)

        const logEntry = await getLog()
        logEntry.should.have.property('event', 'platform.stack.created')
        logEntry.should.have.property('scope', { id: null, type: 'platform' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('stack')
        logEntry.body.stack.should.only.have.keys('id', 'name')
        logEntry.body.stack.id.should.equal(STACK.hashid)
        logEntry.body.stack.name.should.equal(STACK.name)
    })

    it('Provides a logger for deleting platform stacks', async function () {
        // platform - stack - deleted
        await platformLogger.platform.stack.deleted(ACTIONED_BY, null, STACK)

        const logEntry = await getLog()
        logEntry.should.have.property('event', 'platform.stack.deleted')
        logEntry.should.have.property('scope', { id: null, type: 'platform' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('stack')
        logEntry.body.stack.should.only.have.keys('id', 'name')
        logEntry.body.stack.id.should.equal(STACK.hashid)
        logEntry.body.stack.name.should.equal(STACK.name)
    })

    it('Provides a logger for updating platform stacks', async function () {
        // platform - stack - updated
        await platformLogger.platform.stack.updated(ACTIONED_BY, null, STACK, [{ key: 'name', old: 'old', new: 'new' }])

        const logEntry = await getLog()
        logEntry.should.have.property('event', 'platform.stack.updated')
        logEntry.should.have.property('scope', { id: null, type: 'platform' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('stack', 'updates')
        logEntry.body.stack.should.only.have.keys('id', 'name')
        logEntry.body.stack.id.should.equal(STACK.hashid)
        logEntry.body.stack.name.should.equal(STACK.name)
        logEntry.body.updates.should.have.length(1)
        logEntry.body.updates[0].should.eql({ key: 'name', old: 'old', new: 'new' })
    })

    it('Provides a logger for creating platform projectTypes', async function () {
        // platform - projectType - created
        await platformLogger.platform.projectType.created(ACTIONED_BY, null, PROJECTTYPE)
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'platform.project-type.created')
        logEntry.should.have.property('scope', { id: null, type: 'platform' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('projectType')
        logEntry.body.projectType.should.only.have.keys('id', 'name')
        logEntry.body.projectType.id.should.equal(PROJECTTYPE.hashid)
        logEntry.body.projectType.name.should.equal(PROJECTTYPE.name)
    })

    it('Provides a logger for deleting platform projectTypes', async function () {
        // platform - stack - delete
        await platformLogger.platform.projectType.deleted(ACTIONED_BY, null, PROJECTTYPE)
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'platform.project-type.deleted')
        logEntry.should.have.property('scope', { id: null, type: 'platform' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('projectType')
        logEntry.body.projectType.should.only.have.keys('id', 'name')
        logEntry.body.projectType.id.should.equal(PROJECTTYPE.hashid)
        logEntry.body.projectType.name.should.equal(PROJECTTYPE.name)
    })

    it('Provides a logger for updating platform projectTypes', async function () {
        // platform - projectType - updated
        await platformLogger.platform.projectType.updated(ACTIONED_BY, null, PROJECTTYPE, [{ key: 'name', old: 'old', new: 'new' }])

        const logEntry = await getLog()
        logEntry.should.have.property('event', 'platform.project-type.updated')
        logEntry.should.have.property('scope', { id: null, type: 'platform' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('projectType', 'updates')
        logEntry.body.projectType.should.only.have.keys('id', 'name')
        logEntry.body.projectType.id.should.equal(PROJECTTYPE.hashid)
        logEntry.body.projectType.name.should.equal(PROJECTTYPE.name)
        logEntry.body.updates.should.have.length(1)
        logEntry.body.updates[0].should.eql({ key: 'name', old: 'old', new: 'new' })
    })

    it('Provides a logger for applying a platform license', async function () {
        // platform - license - applied
        await platformLogger.platform.license.applied(ACTIONED_BY, null, 'a-license')

        const logEntry = await getLog()
        logEntry.should.have.property('event', 'platform.license.applied')
        logEntry.should.have.property('scope', { id: null, type: 'platform' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('license')
        logEntry.body.license.should.only.have.keys('key')
        logEntry.body.license.key.should.equal('a-license')
    })

    it('Provides a logger for inspecting a platform license', async function () {
        // platform - license - inspected
        await platformLogger.platform.license.inspected(ACTIONED_BY, null, 'a-license')

        const logEntry = await getLog()
        logEntry.should.have.property('event', 'platform.license.inspected')
        logEntry.should.have.property('scope', { id: null, type: 'platform' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('license')
        logEntry.body.license.should.only.have.keys('key')
        logEntry.body.license.key.should.equal('a-license')
    })

    it('Provides a logger for a platform license overage', async function () {
        // platform - license - overage
        const overage = { resource: 'users', count: 6, limit: 5 }
        await platformLogger.platform.license.overage('system', null, overage)

        const logEntry = await getLog()
        logEntry.should.have.property('event', 'platform.license.overage')
        logEntry.should.have.property('scope', { id: null, type: 'platform' })
        logEntry.should.have.property('trigger', { id: 'system', type: 'system', name: 'FlowFuse Platform' })
        logEntry.should.have.property('body').and.be.an.Object()
        logEntry.body.should.have.property('info', overage)
    })

    // #region Team Tests
    it('Provides a logger for a platform team created', async function () {
        // platform - team - created
        const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
        const TEAM = await app.db.models.Team.create({ name: 'temp-team1', active: true, TeamTypeId: defaultTeamType.id })
        await platformLogger.platform.team.created(ACTIONED_BY, null, TEAM)

        const logEntry = await getLog()
        logEntry.should.have.property('event', 'platform.team.created')
        logEntry.should.have.property('scope', { id: null, type: 'platform' })
        logEntry.should.have.property('trigger')
        logEntry.trigger.should.have.property('id', ACTIONED_BY.hashid)
        logEntry.trigger.should.have.property('type', 'user')
        logEntry.trigger.should.have.property('name', ACTIONED_BY.username)
        logEntry.should.have.property('body')
        logEntry.body.should.have.property('team')
        logEntry.body.team.should.have.property('id', TEAM.hashid)
        logEntry.body.team.should.have.property('name', TEAM.name)
    })
    it('Provides a logger for a platform team deleted', async function () {
        // platform - team - deleted
        const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
        const TEAM = await app.db.models.Team.create({ name: 'temp-team2', active: true, TeamTypeId: defaultTeamType.id })
        await platformLogger.platform.team.deleted(ACTIONED_BY, null, TEAM)

        const logEntry = await getLog()
        logEntry.should.have.property('event', 'platform.team.deleted')
        logEntry.should.have.property('scope', { id: null, type: 'platform' })
        logEntry.should.have.property('trigger')
        logEntry.trigger.should.have.property('id', ACTIONED_BY.hashid)
        logEntry.trigger.should.have.property('type', 'user')
        logEntry.trigger.should.have.property('name', ACTIONED_BY.username)
        logEntry.should.have.property('body')
        logEntry.body.should.have.property('team')
        logEntry.body.team.should.have.property('id', TEAM.hashid)
        logEntry.body.team.should.have.property('name', TEAM.name)
    })
    describe('audit-log/export', async function() {

        const TestObjects = {
            tokens: {}
        }

        async function login (username, password) {
            const response = await app.inject({
                method: 'POST',
                url: '/account/login',
                payload: { username, password, remember: false }
            })
            response.cookies.should.have.length(1)
            response.cookies[0].should.have.property('name', 'sid')
            TestObjects.tokens[username] = response.cookies[0].value
        }

        before(async function () {
            TestObjects.alice = await app.db.models.User.byUsername('alice')
            TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
            await login('alice', 'aaPassword')
            await login('bob', 'bbPassword')
        })

        it('Audit log should be accessible to admin', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/admin/audit-log/export',
                query: {
                    limit: 5
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
        })

        it('Audit log should not be accessible to non admin', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/admin/audit-log/export',
                query: {
                    limit: 5
                },
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })

        it('Audit log should have header', async function () {
            await platformLogger.platform.stack.created(0, null, STACK)
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/admin/audit-log/export',
                query: {
                    limit: 5
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const body = response.body
            const rows = body.split('\r\n')
            rows.should.have.length(2)
            rows[0].should.equal('id,event,body,scope,trigger,createdAt')
            
        })
    })
})
