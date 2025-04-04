const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
const { Roles, RoleNames } = FF_UTIL.require('forge/lib/roles')
// Declare a dummy getLoggers function for type hint only
/** @type {import('../../../../forge/auditLog/team').getLoggers} */
const getLoggers = (app) => { return {} }

describe('Audit Log > Team', async function () {
    let app
    let ACTIONED_BY
    let TEAM
    let PROJECT
    let DEVICE
    let USER
    let ROLE
    let BILLING_SESSION
    let SUBSCRIPTION
    let APPLICATION
    let PIPELINE
    let PIPELINE_STAGE_1
    let PIPELINE_STAGE_2

    // temporarily assign the logger purely for type info & intellisense
    // so that xxxxxLogger.yyy.zzz function parameters are offered
    // The real logger is assigned in the before() function
    let teamLogger = getLoggers(null)

    before(async () => {
        app = await FF_UTIL.setupApp()
        // get Team scope logger
        teamLogger = app.auditLog.Team
        ACTIONED_BY = await app.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })

        const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
        TEAM = await app.db.models.Team.create({ name: 'ATeam', TeamTypeId: defaultTeamType.id })

        PROJECT = await app.db.models.Project.create({ name: 'project1', type: '', url: '' })
        await TEAM.addProject(PROJECT)
        DEVICE = await app.db.models.Device.create({ name: 'deviceOne', type: 'something', credentialSecret: 'deviceKey' })
        USER = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword', admin: true })
        ROLE = Roles.Member
        BILLING_SESSION = { id: 'billing_session' }
        SUBSCRIPTION = { subscription: 'subscription' }
        APPLICATION = await app.db.models.Application.create({ name: 'application1', TeamId: TEAM.id })
        PIPELINE = { id: 'pipeline', name: 'pipeline', ApplicationId: APPLICATION.id }
        PIPELINE_STAGE_1 = { id: 'pipeline_stage_1', name: 'pipeline stage 1', NextStageId: 'pipeline_stage_2', PipelineId: PIPELINE.id }
        PIPELINE_STAGE_2 = { id: 'pipeline_stage_2', name: 'pipeline stage 2', NextStageId: null, PipelineId: PIPELINE.id }
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
        await teamLogger.team.device.created(0, null, TEAM, DEVICE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('trigger', { id: 'system', type: 'system', name: 'FlowFuse Platform' })
        logEntry.should.have.property('body').and.be.an.Object()
        logEntry.body.should.not.have.property('trigger')
    })

    // #endregion

    // #region Team - Team Actions

    it('Provides a logger for creating a team', async function () {
        await teamLogger.team.created(ACTIONED_BY, null, TEAM)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.created')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('team')
        logEntry.body.team.should.only.have.keys('id', 'name', 'slug', 'type')
        logEntry.body.team.id.should.equal(TEAM.hashid)
    })

    it('Provides a logger for deleting a team', async function () {
        await teamLogger.team.deleted(ACTIONED_BY, null, TEAM)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.deleted')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('team')
        logEntry.body.team.should.only.have.keys('id', 'name', 'slug', 'type')
        logEntry.body.team.id.should.equal(TEAM.hashid)
    })

    // #endregion

    // #region Team - User Actions

    it('Provides a logger for adding a user to team', async function () {
        await teamLogger.team.user.added(ACTIONED_BY, null, TEAM, USER)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.user.added')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('user')
        logEntry.body.user.should.only.have.keys('id', 'name', 'username', 'email')
        logEntry.body.user.id.should.equal(USER.hashid)
    })

    it('Provides a logger for removing a user from a team', async function () {
        await teamLogger.team.user.removed(ACTIONED_BY, null, TEAM, USER)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.user.removed')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('user')
        logEntry.body.user.should.only.have.keys('id', 'name', 'username', 'email')
        logEntry.body.user.id.should.equal(USER.hashid)
    })

    it('Provides a logger for inviting a user to a team', async function () {
        await teamLogger.team.user.invited(ACTIONED_BY, null, TEAM, USER, ROLE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.user.invited')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('user')
        logEntry.body.user.should.only.have.keys('id', 'name', 'username', 'email', 'role')
        logEntry.body.user.id.should.equal(USER.hashid)
        logEntry.body.user.role.should.equal(RoleNames[Roles.Member])
    })

    it('Provides a logger for inviting a user to a team', async function () {
        await teamLogger.team.user.uninvited(ACTIONED_BY, null, TEAM, USER, ROLE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.user.uninvited')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('user')
        logEntry.body.user.should.only.have.keys('id', 'name', 'username', 'email', 'role')
        logEntry.body.user.id.should.equal(USER.hashid)
        logEntry.body.user.role.should.equal(RoleNames[Roles.Member])
    })

    it('Provides a logger for accepting an invite to a team', async function () {
        await teamLogger.team.user.invite.accepted(ACTIONED_BY, null, TEAM, USER, ROLE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.user.invite.accepted')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('user')
        logEntry.body.user.should.only.have.keys('id', 'name', 'username', 'email', 'role')
        logEntry.body.user.id.should.equal(USER.hashid)
        logEntry.body.user.role.should.equal(RoleNames[Roles.Member])
    })

    it('Provides a logger for rejecting an invite to a team', async function () {
        await teamLogger.team.user.invite.rejected(ACTIONED_BY, null, TEAM, USER, ROLE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.user.invite.rejected')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('user')
        logEntry.body.user.should.only.have.keys('id', 'name', 'username', 'email', 'role')
        logEntry.body.user.id.should.equal(USER.hashid)
        logEntry.body.user.role.should.equal(RoleNames[Roles.Member])
    })

    it('Provides a logger for changing a user role in a team', async function () {
        await teamLogger.team.user.roleChanged(ACTIONED_BY, null, TEAM, USER, [{ key: 'name', old: 'old', new: 'new' }])
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.user.role-changed')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('user', 'updates')
        logEntry.body.user.should.only.have.keys('id', 'name', 'username', 'email')
        logEntry.body.user.id.should.equal(USER.hashid)
        logEntry.body.updates.should.have.length(1)
        logEntry.body.updates[0].should.eql({ key: 'name', old: 'old', new: 'new' })
    })

    // #endregion

    // #region Team - Settings

    it('Provides a logger for when settings are updated for a team', async function () {
        await teamLogger.team.settings.updated(ACTIONED_BY, null, TEAM, [{ key: 'name', old: 'old', new: 'new' }])
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.settings.updated')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('updates', 'team')
        logEntry.body.team.should.only.have.keys('id', 'name', 'slug', 'type')
        logEntry.body.team.id.should.equal(TEAM.hashid)
        logEntry.body.updates.should.have.length(1)
        logEntry.body.updates[0].should.eql({ key: 'name', old: 'old', new: 'new' })
    })

    // #endregion

    // #region Team - Devices - Developer Mode

    it('Provides a logger for when developer mode is enabled for a device in a team', async function () {
        await teamLogger.team.device.developerMode.enabled(ACTIONED_BY, null, TEAM, DEVICE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.developer-mode.enabled')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    it('Provides a logger for when developer mode is disabled for a device in a team', async function () {
        await teamLogger.team.device.developerMode.disabled(ACTIONED_BY, null, TEAM, DEVICE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.developer-mode.disabled')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    it('Provides a logger for when remote access is enabled for a device in a team', async function () {
        await teamLogger.team.device.remoteAccess.enabled(ACTIONED_BY, null, TEAM, DEVICE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.remote-access.enabled')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    it('Provides a logger for when remote access is disabled for a device in a team', async function () {
        await teamLogger.team.device.remoteAccess.disabled(ACTIONED_BY, null, TEAM, DEVICE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.remote-access.disabled')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    // #endregion

    // #region Team - Devices

    it('Provides a logger for creating a device in a team', async function () {
        await teamLogger.team.device.created(ACTIONED_BY, null, TEAM, DEVICE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.created')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    it('Provides a logger for deleting a device in a team', async function () {
        await teamLogger.team.device.deleted(ACTIONED_BY, null, TEAM, DEVICE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.deleted')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    it('Provides a logger for bulk deleting team devices', async function () {
        await teamLogger.team.device.bulkDeleted(ACTIONED_BY, null, TEAM, ['abcde', 'fghij'])
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.bulk-deleted')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('info')
        logEntry.body.info.should.only.have.keys('count')
        logEntry.body.info.count.should.equal(2)
    })

    it('Provides a logger for deleting a device in a team', async function () {
        await teamLogger.team.device.updated(ACTIONED_BY, null, TEAM, DEVICE, [{ key: 'name', old: 'old', new: 'new' }])
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.updated')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device', 'updates')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
        logEntry.body.updates.should.have.length(1)
        logEntry.body.updates[0].should.eql({ key: 'name', old: 'old', new: 'new' })
    })

    it('Provides a logger for unassigning a device in a team', async function () {
        await teamLogger.team.device.unassigned(ACTIONED_BY, null, TEAM, PROJECT, DEVICE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.unassigned')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device', 'project')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
    })

    it('Provides a logger for assigning a device in a team', async function () {
        await teamLogger.team.device.assigned(ACTIONED_BY, null, TEAM, PROJECT, DEVICE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.assigned')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device', 'project')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
    })

    it('Provides a logger for generating device credentials in a team', async function () {
        await teamLogger.team.device.credentialsGenerated(ACTIONED_BY, null, TEAM, DEVICE)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.credentials-generated')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('device')
        logEntry.body.device.should.only.have.keys('id', 'name')
        logEntry.body.device.id.should.equal(DEVICE.hashid)
    })

    // #endregion

    // #region Team - Project

    it('Provides a logger for creating a project in a team', async function () {
        await teamLogger.project.created(ACTIONED_BY, null, TEAM, PROJECT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.created')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project', 'team')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
        logEntry.body.team.should.only.have.keys('id', 'name', 'slug', 'type')
        logEntry.body.team.id.should.equal(TEAM.hashid)
    })

    it('Provides a logger for deleting a project in a team', async function () {
        await teamLogger.project.deleted(ACTIONED_BY, null, TEAM, PROJECT)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.deleted')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project', 'team')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
        logEntry.body.team.should.only.have.keys('id', 'name', 'slug', 'type')
        logEntry.body.team.id.should.equal(TEAM.hashid)
    })

    it('Provides a logger for duplicating a project in a team', async function () {
        const PROJECT2 = await app.db.models.Project.create({ name: 'project2', type: '', url: '' })

        await teamLogger.project.duplicated(ACTIONED_BY, null, TEAM, PROJECT, PROJECT2)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'project.duplicated')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('project', 'sourceProject')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT2.id)
        logEntry.body.sourceProject.should.only.have.keys('id', 'name')
        logEntry.body.sourceProject.id.should.equal(PROJECT.id)
    })

    // #endregion

    // #region Team - Billing

    it('Provides a logger for creating a billing session in a team', async function () {
        await teamLogger.billing.session.created(ACTIONED_BY, null, TEAM, BILLING_SESSION)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'billing.session.created')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('billingSession', 'team')
        logEntry.body.billingSession.should.only.have.keys('id')
        logEntry.body.billingSession.id.should.equal('billing_session')
        logEntry.body.team.should.only.have.keys('id', 'name', 'slug', 'type')
        logEntry.body.team.id.should.equal(TEAM.hashid)
    })

    it('Provides a logger for completing a billing session in a team', async function () {
        await teamLogger.billing.session.completed(ACTIONED_BY, null, TEAM, BILLING_SESSION)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'billing.session.completed')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('billingSession', 'team')
        logEntry.body.billingSession.should.only.have.keys('id')
        logEntry.body.billingSession.id.should.equal('billing_session')
        logEntry.body.team.should.only.have.keys('id', 'name', 'slug', 'type')
        logEntry.body.team.id.should.equal(TEAM.hashid)
    })

    it('Provides a logger for updating a subscription in a team', async function () {
        await teamLogger.billing.subscription.updated(ACTIONED_BY, null, TEAM, SUBSCRIPTION, [{ key: 'status', old: 'active', new: 'canceled' }])
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'billing.subscription.updated')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('subscription', 'team', 'updates')
        logEntry.body.subscription.should.only.have.keys('subscription')
        logEntry.body.subscription.subscription.should.equal('subscription')
        logEntry.body.team.should.only.have.keys('id', 'name', 'slug', 'type')
        logEntry.body.team.id.should.equal(TEAM.hashid)
        logEntry.body.updates.should.have.length(1)
        logEntry.body.updates[0].should.eql({ key: 'status', old: 'active', new: 'canceled' })
    })

    it('Provides a logger for deleting a subscription in a team', async function () {
        await teamLogger.billing.subscription.deleted(ACTIONED_BY, null, TEAM, SUBSCRIPTION)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'billing.subscription.deleted')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('subscription', 'team')
        logEntry.body.subscription.should.only.have.keys('subscription')
        logEntry.body.subscription.subscription.should.equal('subscription')
        logEntry.body.team.should.only.have.keys('id', 'name', 'slug', 'type')
        logEntry.body.team.id.should.equal(TEAM.hashid)
    })

    it('Provides a logger for applying credit in a team', async function () {
        await teamLogger.billing.subscription.creditApplied(ACTIONED_BY, null, TEAM, SUBSCRIPTION, 10)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'billing.subscription.credit-applied')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('subscription', 'team', 'updates')
        logEntry.body.subscription.should.only.have.keys('subscription')
        logEntry.body.subscription.subscription.should.equal('subscription')
        logEntry.body.team.should.only.have.keys('id', 'name', 'slug', 'type')
        logEntry.body.team.id.should.equal(TEAM.hashid)
        logEntry.body.updates.should.have.length(1)
        logEntry.body.updates[0].should.eql({ key: 'credit', new: 10 })
    })

    it('Provides a logger for creating an provisioning token', async function () {
        await teamLogger.team.device.provisioning.created(ACTIONED_BY, null, 'ABC123', 'Token Name', TEAM, null)
        // {"info":{"tokenId":"Znqv1kl7kg","tokenName":"Auto Provision and join to Data-Processing project"}}
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.provisioning.created')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('info')
        logEntry.body.info.should.only.have.keys('tokenId', 'tokenName')
        logEntry.body.info.tokenId.should.equal('ABC123')
        logEntry.body.info.tokenName.should.equal('Token Name')
    })
    it('Provides a logger for creating a provisioning token with a project assigned', async function () {
        await teamLogger.team.device.provisioning.created(ACTIONED_BY, null, 'DEF456', 'Token Name 2', TEAM, null, PROJECT)
        // {"info":{"tokenId":"Znqv1kl7kg","tokenName":"Auto Provision and join to Data-Processing project"}}
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.provisioning.created')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('info', 'project')
        logEntry.body.info.should.only.have.keys('tokenId', 'tokenName')
        logEntry.body.info.tokenId.should.equal('DEF456')
        logEntry.body.info.tokenName.should.equal('Token Name 2')
        logEntry.body.project.should.only.have.keys('id', 'name')
        logEntry.body.project.id.should.equal(PROJECT.id)
    })
    it('Provides a logger for creating a provisioning token with an application assigned', async function () {
        await teamLogger.team.device.provisioning.created(ACTIONED_BY, null, 'DEF789', 'Token Name 2 (app)', TEAM, APPLICATION, null)
        // {"info":{"tokenId":"Znqv1kl7kg","tokenName":"Auto Provision and join to Data-Processing project"}}
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.provisioning.created')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('info', 'application')
        logEntry.body.info.should.only.have.keys('tokenId', 'tokenName')
        logEntry.body.info.tokenId.should.equal('DEF789')
        logEntry.body.info.tokenName.should.equal('Token Name 2 (app)')
        logEntry.body.application.should.only.have.keys('id', 'name')
        logEntry.body.application.id.should.equal(APPLICATION.id)
    })
    it('Provides a logger for editing a provisioning token - to assign a project', async function () {
        const updates = [{ key: 'project', old: null, new: 'new' }]
        await teamLogger.team.device.provisioning.updated(ACTIONED_BY, null, 'AAA111', 'Token Name 3', TEAM, updates)
        // {"info":{"tokenId":"Znqv1kl7kg","tokenName":"Auto Provision and join to Data-Processing project"}}
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.provisioning.updated')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('info', 'updates')
        logEntry.body.info.should.only.have.keys('tokenId', 'tokenName')
        logEntry.body.info.tokenId.should.equal('AAA111')
        logEntry.body.info.tokenName.should.equal('Token Name 3')
        logEntry.body.updates.should.have.length(1)
        logEntry.body.updates[0].should.eql({ key: 'project', old: null, new: 'new' })
    })
    it('Provides a logger for deleting a provisioning token', async function () {
        await teamLogger.team.device.provisioning.deleted(ACTIONED_BY, null, 'BBB222', 'Token Name 4', TEAM)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'team.device.provisioning.deleted')
        logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('info')
        logEntry.body.info.should.only.have.keys('tokenId', 'tokenName')
        logEntry.body.info.should.have.property('tokenId', 'BBB222')
        logEntry.body.info.should.have.property('tokenName', 'Token Name 4')
    })
    // #endregion

    // #region Team - application
    describe('Application events', async function () {
        it('Provides a logger for creating an application in a team', async function () {
            await teamLogger.application.created(ACTIONED_BY, null, TEAM, APPLICATION)
            // check log stored
            const logEntry = await getLog()
            logEntry.should.have.property('event', 'application.created')
            logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
            logEntry.should.have.property('body').and.be.an.Object()
            logEntry.body.should.only.have.keys('application', 'team')
        })

        it('Provides a logger for updating an application in a team', async function () {
            await teamLogger.application.updated(ACTIONED_BY, null, TEAM, APPLICATION, [{ key: 'name', old: 'old', new: 'new' }])
            // check log stored
            const logEntry = await getLog()
            logEntry.should.have.property('event', 'application.updated')
            logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
            logEntry.should.have.property('body').and.be.an.Object()
            logEntry.body.should.only.have.keys('application', 'team', 'updates')
        })

        it('Provides a logger for deleting an application in a team', async function () {
            await teamLogger.application.deleted(ACTIONED_BY, null, TEAM, APPLICATION)
            // check log stored
            const logEntry = await getLog()
            logEntry.should.have.property('event', 'application.deleted')
            logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
            logEntry.should.have.property('body').and.be.an.Object()
            logEntry.body.should.only.have.keys('application', 'team')
        })

        describe('Pipeline events', async function () {
            it('Provides a logger for creating a pipeline in an application', async function () {
                await teamLogger.application.pipeline.created(ACTIONED_BY, null, TEAM, APPLICATION, PIPELINE)
                // check log stored
                const logEntry = await getLog()
                logEntry.should.have.property('event', 'application.pipeline.created')
                logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
                logEntry.should.have.property('body').and.be.an.Object()
                logEntry.body.should.only.have.keys('application', 'team', 'pipeline')
            })

            it('Provides a logger for updating a pipeline in an application', async function () {
                await teamLogger.application.pipeline.updated(ACTIONED_BY, null, TEAM, APPLICATION, PIPELINE, [{ key: 'name', old: 'old', new: 'new' }])
                // check log stored
                const logEntry = await getLog()
                logEntry.should.have.property('event', 'application.pipeline.updated')
                logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
                logEntry.should.have.property('body').and.be.an.Object()
                logEntry.body.should.only.have.keys('application', 'team', 'pipeline', 'updates')
            })

            it('Provides a logger for deleting a pipeline in an application', async function () {
                await teamLogger.application.pipeline.deleted(ACTIONED_BY, null, TEAM, APPLICATION, PIPELINE)
                // check log stored
                const logEntry = await getLog()
                logEntry.should.have.property('event', 'application.pipeline.deleted')
                logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
                logEntry.should.have.property('body').and.be.an.Object()
                logEntry.body.should.only.have.keys('application', 'team', 'pipeline')
            })

            it('Provides a logger for adding a stage to a pipeline in an application', async function () {
                await teamLogger.application.pipeline.stageAdded(ACTIONED_BY, null, TEAM, APPLICATION, PIPELINE, PIPELINE_STAGE_1)
                // check log stored
                const logEntry = await getLog()
                logEntry.should.have.property('event', 'application.pipeline.stage-added')
                logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
                logEntry.should.have.property('body').and.be.an.Object()
                logEntry.body.should.only.have.keys('application', 'team', 'pipeline', 'pipelineStage')
            })

            it('Provides a logger for deploying a stage in a pipeline in an application', async function () {
                await teamLogger.application.pipeline.stageDeployed(ACTIONED_BY, null, TEAM, APPLICATION, PIPELINE, PIPELINE_STAGE_1, PIPELINE_STAGE_2)
                // check log stored
                const logEntry = await getLog()
                logEntry.should.have.property('event', 'application.pipeline.stage-deployed')
                logEntry.should.have.property('scope', { id: TEAM.hashid, type: 'team' })
                logEntry.should.have.property('body').and.be.an.Object()
                logEntry.body.should.only.have.keys('application', 'team', 'pipeline', 'pipelineStage', 'pipelineStageTarget')
            })
        })
    })
    // #endregion
})
