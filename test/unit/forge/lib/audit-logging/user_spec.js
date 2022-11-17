const sinon = require('sinon')

const should = require('should') // eslint-disable-line
require('should-sinon')
const FF_UTIL = require('flowforge-test-utils')
const Formatters = FF_UTIL.require('forge/lib/audit-logging/formatters')

describe('Audit Log > User', async function () {
    let sandbox

    let app
    let log
    let userLogger, usersLogger, accountLogger

    let getLoggers

    let genBodyStub, triggerObjectStub

    before(() => {
        sandbox = sinon.createSandbox()

        // stub the triggerObject and generateBody functions
        // return args so ew can test correct args given to the fcn
        genBodyStub = sandbox.stub(Formatters, 'generateBody').callsFake(function (args) {
            return args
        })
        // stub the triggerObject and generateBody functions
        triggerObjectStub = sandbox.stub(Formatters, 'triggerObject').callsFake(function () {
            return {
                id: '<id>'
            }
        })
        getLoggers = FF_UTIL.require('forge/lib/audit-logging/user').getLoggers
    })

    beforeEach(async function () {
        // mock app & log
        log = []
        app = {
            db: {
                controllers: {
                    AuditLog: {
                        userLog: function (app, triggerId, event, body, userId) {
                            // create a stub object for easy testing purposes
                            log.push({ app, triggerId, event, body, userId })
                        }
                    }
                }
            }
        }

        userLogger = getLoggers(app).user
        usersLogger = getLoggers(app).users
        accountLogger = getLoggers(app).account
    })

    after(() => {
        sandbox.restore()
    })

    const ACTIONED_BY = {}
    const TEAM = { id: '<team-id>' }
    const USER = { id: '<user-id>' }

    /*
        User - Account
    */

    it('Provides a logger for registering an account', async function () {
        // in this case, both user and actionedBy are the same person
        await accountLogger.register(ACTIONED_BY, null, ACTIONED_BY)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'account.register')
        should(log[0]).have.property('userId', '<id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'user')
    })

    it('Provides a logger for when a user logs out from an account', async function () {
        // in this case, both user and actionBy are the same person
        await accountLogger.logout(ACTIONED_BY, null)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'account.logout')
        should(log[0]).have.property('userId', '<id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'user')
    })

    it('Provides a logger for when a user logs into an account', async function () {
        // in this case, both user and actionBy are the same person
        await accountLogger.login(ACTIONED_BY, null)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'account.login')
        should(log[0]).have.property('userId', '<id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'user')
    })

    it('Provides a logger for when a user forgets their password', async function () {
        // in this case, both user and actionBy are the same person
        await accountLogger.forgotPassword(ACTIONED_BY, null, ACTIONED_BY)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'account.forgot-password')
        should(log[0]).have.property('userId', '<id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'user')
    })

    it('Provides a logger for when a user resets their password', async function () {
        // in this case, both user and actionBy are the same person
        await accountLogger.resetPassword(ACTIONED_BY, null, ACTIONED_BY)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'account.reset-password')
        should(log[0]).have.property('userId', '<id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'user')
    })

    it('Provides a logger for when verifying a created team', async function () {
        await accountLogger.verify.autoCreateTeam(ACTIONED_BY, null)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'account.verify.auto-create-team')
        should(log[0]).have.property('userId', '<id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'team')
    })

    it('Provides a logger for requesting a token', async function () {
        await accountLogger.verify.requestToken(ACTIONED_BY, null)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'account.verify.request-token')
        should(log[0]).have.property('userId', '<id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error')
    })

    it('Provides a logger for verifying a token', async function () {
        await accountLogger.verify.verifyToken(ACTIONED_BY, null)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'account.verify.verify-token')
        should(log[0]).have.property('userId', '<id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error')
    })

    /*
        User
    */

    it('Provides a logger for when a user updates their password', async function () {
        await userLogger.updatedPassword(ACTIONED_BY, null)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'user.updated-password')
        should(log[0]).have.property('userId', '<id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error')
    })

    it('Provides a logger for when a user updates their own settings and details', async function () {
        await userLogger.updatedUser(ACTIONED_BY, null, [{}])
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'user.updated-user')
        should(log[0]).have.property('userId', '<id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'updates')
    })

    it('Provides a logger for when a user accepts an invite', async function () {
        await userLogger.invitation.accepted(ACTIONED_BY, null)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'user.invitation.accepted')
        should(log[0]).have.property('userId', '<id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error')
    })

    it('Provides a logger for when a user deletes an invite', async function () {
        await userLogger.invitation.deleted(ACTIONED_BY, null)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'user.invitation.deleted')
        should(log[0]).have.property('userId', '<id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error')
    })

    /*
        Users
    */

    it('Provides a logger for when a user is created', async function () {
        // actionedBy and user are different users
        await usersLogger.userCreated(ACTIONED_BY, null, USER)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'users.created-user')
        should(log[0]).have.property('userId', '<user-id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'user')
    })

    it('Provides a logger for when a user is deleted', async function () {
        // actionedBy and user are different users
        await usersLogger.userDeleted(ACTIONED_BY, null, USER)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'users.deleted-user')
        should(log[0]).have.property('userId', '<user-id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'user')
    })

    it('Provides a logger for when a team is auto created', async function () {
        // actionedBy and user are different users
        await usersLogger.teamAutoCreated(ACTIONED_BY, null, TEAM, USER)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'users.auto-created-team')
        should(log[0]).have.property('userId', '<user-id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'team', 'user')
    })

    it('Provides a logger for when user in a team is updated', async function () {
        // actionedBy and user are different users
        await usersLogger.updatedUser(ACTIONED_BY, null, [{}], USER)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'users.updated-user')
        should(log[0]).have.property('userId', '<id>')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'updates', 'user')
    })
})
