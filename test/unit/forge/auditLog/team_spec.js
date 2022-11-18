const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
const { Roles, RoleNames } = FF_UTIL.require('forge/lib/roles')

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

    before(async () => {
        app = await FF_UTIL.setupApp()
        ACTIONED_BY = await app.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })

        const defaultTeamType = await app.db.models.TeamType.findOne()
        TEAM = await app.db.models.Team.create({ name: 'ATeam', TeamTypeId: defaultTeamType.id })

        PROJECT = await app.db.models.Project.create({ name: 'project1', type: '', url: '' })
        await TEAM.addProject(PROJECT)
        DEVICE = await app.db.models.Device.create({ name: 'deviceOne', type: 'something', credentialSecret: 'deviceKey' })
        USER = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword', admin: true })
        ROLE = Roles.Member
        BILLING_SESSION = { id: 'billing_session' }
        SUBSCRIPTION = { subscription: 'subscription' }
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

    /*
        Team Actions
    */
    it('Provides a logger for creating a team', async function () {
        await app.auditLog.Team.team.created(ACTIONED_BY, null, TEAM)
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
        await app.auditLog.Team.team.deleted(ACTIONED_BY, null, TEAM)
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

    /*
        Team - User Actions
    */

    it('Provides a logger for adding a user to team', async function () {
        await app.auditLog.Team.team.user.added(ACTIONED_BY, null, TEAM, USER)
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
        await app.auditLog.Team.team.user.removed(ACTIONED_BY, null, TEAM, USER)
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
        await app.auditLog.Team.team.user.invited(ACTIONED_BY, null, TEAM, USER, ROLE)
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
        await app.auditLog.Team.team.user.uninvited(ACTIONED_BY, null, TEAM, USER, ROLE)
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
        await app.auditLog.Team.team.user.invite.accepted(ACTIONED_BY, null, TEAM, USER, ROLE)
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
        await app.auditLog.Team.team.user.invite.rejected(ACTIONED_BY, null, TEAM, USER, ROLE)
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
        await app.auditLog.Team.team.user.roleChanged(ACTIONED_BY, null, TEAM, USER, [{ key: 'name', old: 'old', new: 'new' }])
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

    /*
        Team - Settings
    */

    it('Provides a logger for when settings are updated for a team', async function () {
        await app.auditLog.Team.team.settings.updated(ACTIONED_BY, null, TEAM, [{ key: 'name', old: 'old', new: 'new' }])
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

    /*
        Team - Devices
    */

    it('Provides a logger for creating a device in a team', async function () {
        await app.auditLog.Team.team.device.created(ACTIONED_BY, null, TEAM, DEVICE)
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
        await app.auditLog.Team.team.device.deleted(ACTIONED_BY, null, TEAM, DEVICE)
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

    it('Provides a logger for deleting a device in a team', async function () {
        await app.auditLog.Team.team.device.updated(ACTIONED_BY, null, TEAM, DEVICE, [{ key: 'name', old: 'old', new: 'new' }])
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
        await app.auditLog.Team.team.device.unassigned(ACTIONED_BY, null, TEAM, PROJECT, DEVICE)
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
        await app.auditLog.Team.team.device.assigned(ACTIONED_BY, null, TEAM, PROJECT, DEVICE)
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
        await app.auditLog.Team.team.device.credentialsGenerated(ACTIONED_BY, null, TEAM, DEVICE)
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

    /*
        Team - Project
    */
    it('Provides a logger for creating a project in a team', async function () {
        await app.auditLog.Team.project.created(ACTIONED_BY, null, TEAM, PROJECT)
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
        await app.auditLog.Team.project.deleted(ACTIONED_BY, null, TEAM, PROJECT)
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

        await app.auditLog.Team.project.duplicated(ACTIONED_BY, null, TEAM, PROJECT, PROJECT2)
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

    /*
        Team - Billing
    */

    it('Provides a logger for creating a billing session in a team', async function () {
        await app.auditLog.Team.billing.session.created(ACTIONED_BY, null, TEAM, BILLING_SESSION)
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
        await app.auditLog.Team.billing.session.completed(ACTIONED_BY, null, TEAM, BILLING_SESSION)
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

    it('Provides a logger for deleting a billing session in a team', async function () {
        await app.auditLog.Team.billing.subscription.deleted(ACTIONED_BY, null, TEAM, SUBSCRIPTION)
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
})
