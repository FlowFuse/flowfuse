const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')

// Declare a dummy getLoggers function for type hint only
/** @type {import('../../../../forge/auditLog/user').getLoggers} */
const getLoggers = (app) => { return {} }

describe('Audit Log > User', async function () {
    let app
    let ACTIONED_BY
    let TEAM
    let PROJECT
    let USER
    const TEST_ERR = { message: 'Test Error', code: 'TEST_ERROR' }

    // temporarily assign the logger purely for type info & intellisense
    // so that xxxxxLogger.yyy.zzz function parameters are offered
    // The real logger is assigned in the before() function
    let userLogger = getLoggers(null)

    before(async () => {
        app = await FF_UTIL.setupApp()
        // get User scope logger
        userLogger = app.auditLog.User

        ACTIONED_BY = await app.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })
        const defaultTeamType = await app.db.models.TeamType.findOne()
        TEAM = await app.db.models.Team.create({ name: 'ATeam', TeamTypeId: defaultTeamType.id })
        PROJECT = await app.db.models.Project.create({ name: 'project1', type: '', url: '' })
        await TEAM.addProject(PROJECT)
        USER = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword', admin: true })
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
        await userLogger.account.verify.autoCreateTeam(0, null, TEAM)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('trigger', { id: 'system', type: 'system', name: 'Forge Platform' })
        logEntry.should.have.property('body').and.be.an.Object()
        logEntry.body.should.not.have.property('trigger')
    })

    // #endregion

    // #region User - Account

    it('Provides a logger for registering an account', async function () {
        // in this case, both user and actionedBy are the same person
        await userLogger.account.register(ACTIONED_BY, null, ACTIONED_BY)

        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'account.register')
        logEntry.should.have.property('scope', { id: ACTIONED_BY.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('user')
        bodyShouldHaveUser(logEntry.body, ACTIONED_BY)
    })

    it('Provides a logger for when a user logs out from an account', async function () {
        // in this case, both user and actionBy are the same person
        await userLogger.account.logout(ACTIONED_BY, null)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'account.logout')
        logEntry.should.have.property('scope', { id: ACTIONED_BY.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body').and.be.Undefined()
    })

    it('Provides a logger for a failed login attempt', async function () {
        // in this case, both user and actionBy are the same person
        await userLogger.account.login({ username: 'zandu' }, TEST_ERR)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'account.login')
        logEntry.should.have.property('scope', { id: '', type: 'user' })
        logEntry.should.have.property('trigger', { id: null, hashid: null, type: 'unknown', name: 'unknown' })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('error')
        logEntry.body.should.have.property('error', TEST_ERR)
    })

    it('Provides a logger for when a user logs into an account', async function () {
        // in this case, both user and actionBy are the same person
        await userLogger.account.login(ACTIONED_BY, null)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'account.login')
        logEntry.should.have.property('scope', { id: ACTIONED_BY.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body').and.be.Undefined()
    })

    it('Provides a logger for when a user forgets their password', async function () {
        // in this case, both user and actionBy are the same person
        await userLogger.account.forgotPassword(ACTIONED_BY, null, ACTIONED_BY)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'account.forgot-password')
        logEntry.should.have.property('scope', { id: ACTIONED_BY.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body').and.be.an.Object()
        bodyShouldHaveUser(logEntry.body, ACTIONED_BY)
    })

    it('Provides a logger for when a user resets their password', async function () {
        // in this case, both user and actionBy are the same person
        await userLogger.account.resetPassword(ACTIONED_BY, null, ACTIONED_BY)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'account.reset-password')
        logEntry.should.have.property('scope', { id: ACTIONED_BY.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body').and.be.an.Object()
        bodyShouldHaveUser(logEntry.body, ACTIONED_BY)
    })

    it('Provides a logger for when verifying a created team', async function () {
        await userLogger.account.verify.autoCreateTeam(ACTIONED_BY, null, TEAM)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'account.verify.auto-create-team')
        logEntry.should.have.property('scope', { id: ACTIONED_BY.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body').and.be.an.Object()
        bodyShouldHaveTeam(logEntry.body, TEAM)
    })

    it('Provides a logger for requesting a token', async function () {
        await userLogger.account.verify.requestToken(ACTIONED_BY, null)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'account.verify.request-token')
        logEntry.should.have.property('scope', { id: ACTIONED_BY.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body').and.be.Undefined()
    })

    it('Provides a logger for verifying a token', async function () {
        await userLogger.account.verify.verifyToken(ACTIONED_BY, null)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'account.verify.verify-token')
        logEntry.should.have.property('scope', { id: ACTIONED_BY.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body').and.be.Undefined()
    })

    // #endregion

    // #region User - User

    it('Provides a logger for when a user updates their password', async function () {
        await userLogger.user.updatedPassword(ACTIONED_BY, null)
        const logEntry = await getLog()
        // check log stored
        logEntry.should.have.property('event', 'user.updated-password')
        logEntry.should.have.property('scope', { id: ACTIONED_BY.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body').and.be.Undefined()
    })

    it('Provides a logger for when a user updates their own settings and details', async function () {
        await userLogger.user.updatedUser(ACTIONED_BY, null, [{ key: 'name', old: 'old', new: 'new' }])
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'user.updated-user')
        logEntry.should.have.property('scope', { id: ACTIONED_BY.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('updates')
        logEntry.body.updates.should.have.length(1)
        logEntry.body.updates[0].should.eql({ key: 'name', old: 'old', new: 'new' })
    })

    it('Provides a logger for when a user accepts an invite', async function () {
        await userLogger.user.invitation.accepted(ACTIONED_BY, null)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'user.invitation.accepted')
        logEntry.should.have.property('scope', { id: ACTIONED_BY.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body').and.be.Undefined()
    })

    it('Provides a logger for when a user deletes an invite', async function () {
        await userLogger.user.invitation.deleted(ACTIONED_BY, null)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'user.invitation.deleted')
        logEntry.should.have.property('scope', { id: ACTIONED_BY.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body').and.be.Undefined()
    })

    // #endregion

    // #region User - Users

    it('Provides a logger for when a user is created', async function () {
        // actionedBy and user are different users
        await userLogger.users.userCreated(ACTIONED_BY, null, USER)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'users.created-user')
        logEntry.should.have.property('scope', { id: USER.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('user')
        bodyShouldHaveUser(logEntry.body, USER)
    })

    it('Provides a logger for when a user is deleted', async function () {
        // actionedBy and user are different users
        await userLogger.users.userDeleted(ACTIONED_BY, null, USER)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'users.deleted-user')
        logEntry.should.have.property('scope', { id: USER.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('user')
        bodyShouldHaveUser(logEntry.body, USER)
    })

    it('Provides a logger for when a team is auto created', async function () {
        // actionedBy and user are different users
        await userLogger.users.teamAutoCreated(ACTIONED_BY, null, TEAM, USER)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'users.auto-created-team')
        logEntry.should.have.property('scope', { id: USER.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('user', 'team')
        bodyShouldHaveUser(logEntry.body, USER)
        bodyShouldHaveTeam(logEntry.body, TEAM)
    })

    it('Provides a logger for when user in a team is updated', async function () {
        // actionedBy and user are different users
        await userLogger.users.updatedUser(ACTIONED_BY, null, [{ key: 'name', old: 'old', new: 'new' }], USER)
        // check log stored
        const logEntry = await getLog()
        logEntry.should.have.property('event', 'users.updated-user')
        logEntry.should.have.property('scope', { id: USER.hashid, type: 'user' })
        logEntry.should.have.property('trigger', { id: ACTIONED_BY.hashid, type: 'user', name: ACTIONED_BY.username })
        logEntry.should.have.property('body')
        logEntry.body.should.only.have.keys('user', 'updates')
        bodyShouldHaveUser(logEntry.body, USER)
        logEntry.body.updates.should.have.length(1)
        logEntry.body.updates[0].should.eql({ key: 'name', old: 'old', new: 'new' })
    })

    // #endregion
})

function bodyShouldHaveUser (body, user) {
    body.should.have.property('user').and.be.an.Object()
    body.user.should.only.have.keys('id', 'name', 'username', 'email')
    if (user) {
        body.user.should.only.have.property('id', user.hashid)
    }
}

function bodyShouldHaveTeam (body, team) {
    body.should.have.property('team').and.be.an.Object()
    body.team.should.only.have.keys('id', 'name', 'slug', 'type')
    if (team) {
        body.team.should.only.have.property('id', team.hashid)
    }
}
