const sinon = require('sinon')

const should = require('should') // eslint-disable-line
require('should-sinon')
const FF_UTIL = require('flowforge-test-utils')
const Formatters = FF_UTIL.require('forge/lib/audit-logging/formatters')

describe('Audit Log > Team', async function () {
    let sandbox

    let app
    let log
    let teamLogger, projectLogger, billingLogger

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
        getLoggers = FF_UTIL.require('forge/lib/audit-logging/team').getLoggers
    })

    beforeEach(async function () {
        // mock app & log
        log = []
        app = {
            db: {
                controllers: {
                    AuditLog: {
                        // The way controller functions get encapsulated, they
                        // do not get called with 'app' as their first argument,
                        // even if the implementation of the function expects it.
                        // Here we're mocking the external API of the controller,
                        // which doesn't have 'app'
                        teamLog: function ( teamId, triggerId, event, body) {
                            log.push({ teamId, triggerId, event, body })
                        }
                    }
                }
            }
        }

        teamLogger = getLoggers(app).team
        projectLogger = getLoggers(app).project
        billingLogger = getLoggers(app).billing
    })

    after(() => {
        sandbox.restore()
    })

    const ACTIONED_BY = {}
    const TEAM = { id: '<team-id>' }
    const USER = { id: '<user-id>' }
    const ROLE = { role: '<role>' }
    const PROJECT = { id: '<project-id>' }
    const DEVICE = { id: '<device-id>' }
    const BILLING_SESSION = { }

    /*
        Team Actions
    */

    it('Provides a logger for creating a team', async function () {
        await teamLogger.created(ACTIONED_BY, null, TEAM)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.created')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'team')
    })

    it('Provides a logger for deleting a team', async function () {
        await teamLogger.deleted(ACTIONED_BY, null, TEAM)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.deleted')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'team')
    })

    /*
        Team - User Actions
    */

    it('Provides a logger for adding a user to a team', async function () {
        await teamLogger.user.added(ACTIONED_BY, null, TEAM, USER)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.user.added')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'user')
    })

    it('Provides a logger for removing a user to a team', async function () {
        await teamLogger.user.removed(ACTIONED_BY, null, TEAM, USER)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.user.removed')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'user')
    })

    it('Provides a logger for inviting a user to a team', async function () {
        await teamLogger.user.invited(ACTIONED_BY, null, TEAM, USER, ROLE)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.user.invited')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'user', 'role')
    })

    it('Provides a logger for uninviting a user to a team', async function () {
        await teamLogger.user.uninvited(ACTIONED_BY, null, TEAM, USER, ROLE)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.user.uninvited')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'user', 'role')
    })

    it('Provides a logger for when a user accepts an invite to a team', async function () {
        await teamLogger.user.invite.accepted(ACTIONED_BY, null, TEAM, USER, ROLE)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.user.invite.accepted')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'user', 'role')
    })

    it('Provides a logger for when a user rejects an invite to a team', async function () {
        await teamLogger.user.invite.rejected(ACTIONED_BY, null, TEAM, USER, ROLE)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.user.invite.rejected')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'user', 'role')
    })

    it('Provides a logger for when a user role changes for a team', async function () {
        await teamLogger.user.rollChanged(ACTIONED_BY, null, TEAM, USER, [{}])
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.user.role-changed')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'user', 'updates')
    })

    /*
        Team - Settings
    */

    it('Provides a logger for when settings are updated for a team', async function () {
        await teamLogger.settings.updated(ACTIONED_BY, null, TEAM, [{}])
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.settings.updated')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'team', 'updates')
    })

    /*
        Team - Devices
    */

    it('Provides a logger for creating a device in a team', async function () {
        await teamLogger.device.created(ACTIONED_BY, null, TEAM, DEVICE)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.device.created')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'device')
    })

    it('Provides a logger for deleting a device in a team', async function () {
        await teamLogger.device.deleted(ACTIONED_BY, null, TEAM, DEVICE)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.device.deleted')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'device')
    })

    it('Provides a logger for updating a device in a team', async function () {
        await teamLogger.device.updated(ACTIONED_BY, null, TEAM, DEVICE, [{}])
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.device.updated')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'device', 'updates')
    })

    it('Provides a logger for unassigning a device to a project in a team', async function () {
        await teamLogger.device.unassigned(ACTIONED_BY, null, TEAM, PROJECT, DEVICE)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.device.unassigned')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'device', 'project')
    })

    it('Provides a logger for assigning a device to a project in a team', async function () {
        await teamLogger.device.assigned(ACTIONED_BY, null, TEAM, PROJECT, DEVICE)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.device.assigned')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'device', 'project')
    })

    it('Provides a logger for generating device credentials in a team', async function () {
        await teamLogger.device.credentialsGenerated(ACTIONED_BY, null, TEAM, PROJECT, DEVICE)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'team.device.credentials-generated')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'device', 'project')
    })

    /*
        Team - Project
    */

    it('Provides a project logger for recording the creation of a project in a team', async function () {
        await projectLogger.created(ACTIONED_BY, null, TEAM, PROJECT)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.created')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'team', 'project')
    })

    it('Provides a project logger for recording the deletion of a project in a team', async function () {
        await projectLogger.deleted(ACTIONED_BY, null, TEAM, PROJECT)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.deleted')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'team', 'project')
    })

    it('Provides a project logger for recording the duplication of a project in a team', async function () {
        await projectLogger.duplicated(ACTIONED_BY, null, TEAM, PROJECT, PROJECT)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.duplicated')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'project', 'sourceProject')
    })

    /*
        Team - Billing
    */

    it('Provides a billing logger for creating a billing session in a team', async function () {
        await billingLogger.session.created(ACTIONED_BY, null, TEAM, BILLING_SESSION)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'billing.session.created')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'team', 'billingSession')
    })

    it('Provides a billing logger for completed a billing session in a team', async function () {
        await billingLogger.session.completed(ACTIONED_BY, null, TEAM, BILLING_SESSION)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'billing.session.completed')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'team', 'billingSession')
    })

    it('Provides a billing logger for deleting a subscription to a team', async function () {
        await billingLogger.subscription.deleted(ACTIONED_BY, null, TEAM, BILLING_SESSION)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('teamId', '<team-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'billing.subscription.deleted')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'team', 'subscription')
    })
})
