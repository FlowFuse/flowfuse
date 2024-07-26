const should = require('should') // eslint-disable-line
const { UpdatesCollection } = require('../../../../forge/auditLog/formatters')

const FF_UTIL = require('flowforge-test-utils')

// Declare a dummy getLoggers function for type hint only
/** @type {import('../../../../forge/auditLog/application').getLoggers} */
const getLoggers = (app) => { return {} }

describe('Audit Log > Application', async function () {
    let app
    let ACTIONED_BY
    let TEAM
    let APPLICATION
    let DEVICE
    let DEVICEGROUP
    let SNAPSHOT

    // temporarily assign the logger purely for type info & intellisense
    // so that xxxxxLogger.yyy.zzz function parameters are offered
    // The real logger is assigned in the before() function
    let logger = getLoggers(null)

    before(async () => {
        app = await FF_UTIL.setupApp()
        // get Project scope logger
        logger = app.auditLog.Application

        ACTIONED_BY = await app.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })

        const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
        TEAM = await app.db.models.Team.create({ name: 'ATeam', TeamTypeId: defaultTeamType.id })

        APPLICATION = await app.db.models.Application.create({ name: 'application1', TeamId: TEAM.id })
        // await TEAM.addProject(APPLICATION)
        DEVICE = await app.db.models.Device.create({ name: 'deviceOne', type: 'something', credentialSecret: 'deviceKey' })

        DEVICEGROUP = await app.db.models.DeviceGroup.create({ name: 'deviceGroupOne', ApplicationId: APPLICATION.id })

        SNAPSHOT = await app.db.models.ProjectSnapshot.create({
            name: 'snapshot',
            description: '',
            settings: {},
            flows: {},
            DeviceId: DEVICE.id
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

    it('Permits a logger to be triggered by system', async function () {
        // call any function to trigger the logger with a system user id
        await logger.application.created(0 /* system */, null, APPLICATION)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'application.created')
        logEntry.should.have.property('scope', { id: APPLICATION.hashid, type: 'application' })
        logEntry.should.have.property('trigger', { id: 'system', type: 'system', name: 'FlowFuse Platform' })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('application') // should exclude the 'trigger' property from body
        logEntry.body.application.should.only.have.keys('id', 'name')
    })

    // #endregion

    // #region Application - Actions

    it('Provides a logger for creating an application', async function () {
        await logger.application.created(ACTIONED_BY, null, TEAM, APPLICATION)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'application.created')
        logEntry.should.have.property('scope', { id: APPLICATION.hashid, type: 'application' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('application')
        logEntry.body.application.should.only.have.keys('id', 'name')
        logEntry.body.application.id.should.equal(APPLICATION.id)
    })

    it('Provides a logger for updating an application', async function () {
        await logger.application.updated(ACTIONED_BY, null, APPLICATION)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'application.updated')
        logEntry.should.have.property('scope', { id: APPLICATION.hashid, type: 'application' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('application')
        logEntry.body.application.should.only.have.keys('id', 'name')
        logEntry.body.application.id.should.equal(APPLICATION.id)
    })

    // #endregion

    // #region Application Device Actions

    it('Provides a logger for unassigning a device from an application', async function () {
        await logger.application.device.unassigned(ACTIONED_BY, null, APPLICATION, DEVICE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'application.device.unassigned')
        logEntry.should.have.property('scope', { id: APPLICATION.hashid, type: 'application' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('application', 'device')
        logEntry.body.application.should.only.have.keys('id', 'name')
        logEntry.body.application.id.should.equal(APPLICATION.id)
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    it('Provides a logger for assigning a device from an application', async function () {
        await logger.application.device.assigned(ACTIONED_BY, null, APPLICATION, DEVICE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'application.device.assigned')
        logEntry.should.have.property('scope', { id: APPLICATION.hashid, type: 'application' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('application', 'device')
        logEntry.body.application.should.only.have.keys('id', 'name')
        logEntry.body.application.id.should.equal(APPLICATION.id)
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    it('Provides a logger for application device snapshot created', async function () {
        await logger.application.device.snapshot.created(ACTIONED_BY, null, APPLICATION, DEVICE, SNAPSHOT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'application.device.snapshot.created')
        logEntry.should.have.property('scope', { id: APPLICATION.hashid, type: 'application' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device', 'snapshot')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
        logEntry.body.snapshot.should.only.have.keys('id', 'name')
        logEntry.body.snapshot.id.should.equal(SNAPSHOT.hashid)
    })

    it('Provides a logger for application device snapshot deleted', async function () {
        await logger.application.device.snapshot.deleted(ACTIONED_BY, null, APPLICATION, DEVICE, SNAPSHOT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'application.device.snapshot.deleted')
        logEntry.should.have.property('scope', { id: APPLICATION.hashid, type: 'application' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device', 'snapshot')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
        logEntry.body.snapshot.should.only.have.keys('id', 'name')
        logEntry.body.snapshot.id.should.equal(SNAPSHOT.hashid)
    })

    it('Provides a logger for application device snapshot exported', async function () {
        await logger.application.device.snapshot.exported(ACTIONED_BY, null, APPLICATION, DEVICE, SNAPSHOT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'application.device.snapshot.exported')
        logEntry.should.have.property('scope', { id: APPLICATION.hashid, type: 'application' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device', 'snapshot')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
        logEntry.body.snapshot.should.only.have.keys('id', 'name')
        logEntry.body.snapshot.id.should.equal(SNAPSHOT.hashid)
    })

    it('Provides a logger for application device snapshot imported', async function () {
        await logger.application.device.snapshot.imported(ACTIONED_BY, null, APPLICATION, DEVICE, null, null, SNAPSHOT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'application.device.snapshot.imported')
        logEntry.should.have.property('scope', { id: APPLICATION.hashid, type: 'application' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device', 'snapshot')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
        logEntry.body.snapshot.should.only.have.keys('id', 'name')
        logEntry.body.snapshot.id.should.equal(SNAPSHOT.hashid)
    })

    it('Provides a logger for creating a device group', async function () {
        await logger.application.deviceGroup.created(ACTIONED_BY, null, APPLICATION, DEVICEGROUP)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'application.deviceGroup.created')
        logEntry.should.have.property('scope', { id: APPLICATION.hashid, type: 'application' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('application', 'deviceGroup')
        logEntry.body.application.should.only.have.keys('id', 'name')
        logEntry.body.application.id.should.equal(APPLICATION.id)
        logEntry.body.deviceGroup.should.only.have.keys('id', 'name')
    })

    it('Provides a logger for updating a device group', async function () {
        const copyOfDeviceGroup = { ...DEVICEGROUP }
        copyOfDeviceGroup.name = 'deviceGroupOne-new-name'
        copyOfDeviceGroup.description = 'new-description'
        const updates = new UpdatesCollection()
        updates.pushDifferences(DEVICEGROUP, copyOfDeviceGroup)
        await logger.application.deviceGroup.updated(ACTIONED_BY, null, APPLICATION, DEVICEGROUP, updates)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'application.deviceGroup.updated')
        logEntry.should.have.property('scope', { id: APPLICATION.hashid, type: 'application' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('application', 'deviceGroup', 'updates')
        logEntry.body.application.should.only.have.keys('id', 'name')
        logEntry.body.application.id.should.equal(APPLICATION.id)
        logEntry.body.deviceGroup.should.only.have.keys('id', 'name')
        logEntry.body.updates.should.be.an.Array().and.have.length(2)
    })

    it('Provides a logger for deleting a device group', async function () {
        await logger.application.deviceGroup.deleted(ACTIONED_BY, null, APPLICATION, DEVICEGROUP)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'application.deviceGroup.deleted')
        logEntry.should.have.property('scope', { id: APPLICATION.hashid, type: 'application' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('application', 'deviceGroup')
        logEntry.body.application.should.only.have.keys('id', 'name')
        logEntry.body.application.id.should.equal(APPLICATION.id)
        logEntry.body.deviceGroup.should.only.have.keys('id', 'name')
    })

    it('Provides a logger for changing device group members', async function () {
        const info = 'Added 2, Removed 1'
        await logger.application.deviceGroup.membersChanged(ACTIONED_BY, null, APPLICATION, DEVICEGROUP, null, info)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'application.deviceGroup.members.changed')
        logEntry.should.have.property('scope', { id: APPLICATION.hashid, type: 'application' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('application', 'deviceGroup', 'info')
        logEntry.body.application.should.only.have.keys('id', 'name')
        logEntry.body.application.id.should.equal(APPLICATION.id)
        logEntry.body.deviceGroup.should.only.have.keys('id', 'name')
        logEntry.body.info.should.have.property('info', info)
    })

    // #endregion
})
