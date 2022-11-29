const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
// Declare a dummy getLoggers function for type hint only
/** @type {import('../../../../forge/auditLog/project').getLoggers} */
const getLoggers = (app) => { return {} }

describe('Audit Log > Project', async function () {
    let app
    let ACTIONED_BY
    let TEAM
    let PROJECT
    let DEVICE
    let STACK
    let SNAPSHOT

    // temporarily assign the logger purely for type info & intellisense
    // so that xxxxxLogger.yyy.zzz function parameters are offered
    // The real logger is assigned in the before() function
    let projectLogger = getLoggers(null)

    before(async () => {
        app = await FF_UTIL.setupApp()
        // get Project scope logger
        projectLogger = app.auditLog.Project

        ACTIONED_BY = await app.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })

        const defaultTeamType = await app.db.models.TeamType.findOne()
        TEAM = await app.db.models.Team.create({ name: 'ATeam', TeamTypeId: defaultTeamType.id })

        PROJECT = await app.db.models.Project.create({ name: 'project1', type: '', url: '' })
        await TEAM.addProject(PROJECT)
        DEVICE = await app.db.models.Device.create({ name: 'deviceOne', type: 'something', credentialSecret: 'deviceKey' })
        STACK = await app.db.models.ProjectStack.create({
            name: 'stack1',
            active: true,
            properties: { nodered: '2.2.2' }
        })
        SNAPSHOT = await app.db.models.ProjectSnapshot.create({
            name: 'snapshot',
            description: '',
            settings: {},
            flows: {}
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
        await projectLogger.project.started(0 /* system */, null, PROJECT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.started')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: 'system', type: 'system', name: 'Forge Platform' })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project') // should exclude the 'trigger' property from body
        logEntry.body.project.should.only.have.keys('id', 'name')
    })

    // #endregion

    // #region Project - Actions

    it('Provides a logger for creating a project', async function () {
        await projectLogger.project.created(ACTIONED_BY, null, TEAM, PROJECT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.created')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('team', 'project')
        logEntry.body.team.should.only.have.keys('id', 'name', 'slug', 'type')
        logEntry.body.team.id.should.equal(TEAM.hashid)
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
    })

    it('Provides a logger for deleting a project', async function () {
        await projectLogger.project.deleted(ACTIONED_BY, null, TEAM, PROJECT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.deleted')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('team', 'project')
        logEntry.body.team.should.only.have.keys('id', 'name', 'slug', 'type')
        logEntry.body.team.id.should.equal(TEAM.hashid)
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
    })

    it('Provides a logger for starting a project', async function () {
        await projectLogger.project.started(ACTIONED_BY, null, PROJECT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.started')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
    })

    it('Provides a logger for project start failure', async function () {
        await projectLogger.project.startFailed(ACTIONED_BY, { code: 'something_happened', message: 'Project start failed' }, PROJECT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.start-failed')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('error')
        logEntry.body.error.code.should.equal('something_happened')
        logEntry.body.error.message.should.equal('Project start failed')
    })

    it('Provides a logger for stopping a project', async function () {
        await projectLogger.project.stopped(ACTIONED_BY, null, PROJECT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.stopped')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
    })

    it('Provides a logger for restarting a project', async function () {
        await projectLogger.project.restarted(ACTIONED_BY, null, PROJECT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.restarted')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
    })

    it('Provides a logger for suspending a project', async function () {
        await projectLogger.project.suspended(ACTIONED_BY, null, PROJECT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.suspended')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
    })

    it('Provides a logger for importing flows into a project', async function () {
        await projectLogger.project.flowImported(ACTIONED_BY, null, PROJECT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.flow-imported')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
    })

    // #endregion

    // #region Project Device Actions

    it('Provides a logger for unassigning a device from a project', async function () {
        await projectLogger.project.device.unassigned(ACTIONED_BY, null, PROJECT, DEVICE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.device.unassigned')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project', 'device')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    it('Provides a logger for assigning a device from a project', async function () {
        await projectLogger.project.device.assigned(ACTIONED_BY, null, PROJECT, DEVICE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.device.assigned')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project', 'device')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    it('Provides a logger for changing a stack of a project', async function () {
        await projectLogger.project.stack.changed(ACTIONED_BY, null, PROJECT, STACK)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.stack.changed')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project', 'stack')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
        logEntry.body.stack.should.only.have.keys('id', 'name')
        logEntry.body.stack.id.should.equal(STACK.hashid)
    })

    it('Provides a logger for changing a settings of a project', async function () {
        await projectLogger.project.settings.updated(ACTIONED_BY, null, PROJECT, [{ key: 'name', old: 'old', new: 'new' }])
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.settings.updated')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project', 'updates')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
        logEntry.body.updates.should.have.length(1)
        logEntry.body.updates[0].should.eql({ key: 'name', old: 'old', new: 'new' })
    })

    // #endregion

    // #region Project Snapshots

    it('Provides a logger for creating snapshots of a project', async function () {
        await projectLogger.project.snapshot.created(ACTIONED_BY, null, PROJECT, SNAPSHOT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.snapshot.created')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project', 'snapshot')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
        logEntry.body.snapshot.should.only.have.keys('id', 'name')
        logEntry.body.snapshot.id.should.equal(SNAPSHOT.hashid)
    })

    it('Provides a logger for rolling back a snapshot of a project', async function () {
        await projectLogger.project.snapshot.rolledBack(ACTIONED_BY, null, PROJECT, SNAPSHOT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.snapshot.rolled-back')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project', 'snapshot')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
        logEntry.body.snapshot.should.only.have.keys('id', 'name')
        logEntry.body.snapshot.id.should.equal(SNAPSHOT.hashid)
    })

    it('Provides a logger for deleteing a snapshot of a project', async function () {
        await projectLogger.project.snapshot.deleted(ACTIONED_BY, null, PROJECT, SNAPSHOT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.snapshot.deleted')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project', 'snapshot')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
        logEntry.body.snapshot.should.only.have.keys('id', 'name')
        logEntry.body.snapshot.id.should.equal(SNAPSHOT.hashid)
    })

    it('Provides a logger for assigning a device target to a snapshot of a project', async function () {
        await projectLogger.project.snapshot.deviceTargetSet(ACTIONED_BY, null, PROJECT, SNAPSHOT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.snapshot.device-target-set')
        logEntry.should.have.property('scope', { id: PROJECT.id, type: 'project' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project', 'snapshot')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
        logEntry.body.snapshot.should.only.have.keys('id', 'name')
        logEntry.body.snapshot.id.should.equal(SNAPSHOT.hashid)
    })

    // #endregion
})
