const should = require('should') // eslint-disable-line

const FF_UTIL = require('flowforge-test-utils')

// Declare a dummy getLoggers function for type hint only
/** @type {import('../../../../forge/auditLog/application').getLoggers} */
const getLoggers = (app) => { return {} }

describe('Audit Log > Device', async function () {
    let app
    let ACTIONED_BY
    let APPLICATION
    let DEVICE
    let TEAM

    // temporarily assign the logger purely for type info & intellisense
    // so that xxxxxLogger.yyy.zzz function parameters are offered
    // The real logger is assigned in the before() function
    let logger = getLoggers(null)


    before(async () => {
        app = await FF_UTIL.setupApp()
        logger = app.auditLog.Device

        const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })

        ACTIONED_BY = await app.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })
        TEAM = await app.db.models.Team.create({ name: 'ATeam', TeamTypeId: defaultTeamType.id })
        APPLICATION = await app.db.models.Application.create({ name: 'application1', TeamId: TEAM.id })
        DEVICE = await app.db.models.Device.create({ name: 'deviceOne', type: 'something', credentialSecret: 'deviceKey' })
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

    it('Provides a logger for generating credentials', async function () {
        await logger.device.credentials.generated(ACTIONED_BY, null, DEVICE)
        const logEntry = await getLog()
        logEntry.should.have.property('event','device.credential.generated')
        logEntry.should.have.property('scope', { id: DEVICE.hashid, type: 'device'})
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    it('Provides a logger for enabling developer mode', async function () {
        await logger.device.developerMode.enabled(ACTIONED_BY, null, DEVICE)
        const logEntry = await getLog()
        logEntry.should.have.property('event','device.developer-mode.enabled')
        logEntry.should.have.property('scope', { id: DEVICE.hashid, type: 'device'})
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    it('Provides a logger for disabling developer mode', async function () {
        await logger.device.developerMode.disabled(ACTIONED_BY, null, DEVICE)
        const logEntry = await getLog()
        logEntry.should.have.property('event','device.developer-mode.disabled')
        logEntry.should.have.property('scope', { id: DEVICE.hashid, type: 'device'})
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    it('Provides a logger for enabling remote access', async function () {
        await logger.device.remoteAccess.enabled(ACTIONED_BY, null, DEVICE)
        const logEntry = await getLog()
        logEntry.should.have.property('event','device.remote-access.enabled')
        logEntry.should.have.property('scope', { id: DEVICE.hashid, type: 'device'})
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    it('Provides a logger for disabling remove access', async function () {
        await logger.device.remoteAccess.disabled(ACTIONED_BY, null, DEVICE)
        const logEntry = await getLog()
        logEntry.should.have.property('event','device.remote-access.disabled')
        logEntry.should.have.property('scope', { id: DEVICE.hashid, type: 'device'})
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    it('Provide a logger for assigned to Application', async function () {
        await logger.device.assigned(ACTIONED_BY, null, APPLICATION, DEVICE)
        const logEntry = await getLog()
        logEntry.should.have.property('event','device.assigned')
        logEntry.should.have.property('scope', { id: DEVICE.hashid, type: 'device'})
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('application', 'device')
        logEntry.body.application.should.only.have.keys('id', 'name')
        logEntry.body.device.should.only.have.keys('id', 'name')
    })

    it('Provide a logger for unassigned from Application', async function () {
        await logger.device.unassigned(ACTIONED_BY, null, APPLICATION, DEVICE)
        const logEntry = await getLog()
        logEntry.should.have.property('event','device.unassigned')
        logEntry.should.have.property('scope', { id: DEVICE.hashid, type: 'device'})
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('application', 'device')
        logEntry.body.application.should.only.have.keys('id', 'name')
        logEntry.body.device.should.only.have.keys('id', 'name')
    })
})