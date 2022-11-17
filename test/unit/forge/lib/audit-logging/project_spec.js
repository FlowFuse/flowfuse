const sinon = require('sinon')

const should = require('should') // eslint-disable-line
require('should-sinon')
const FF_UTIL = require('flowforge-test-utils')
const Formatters = FF_UTIL.require('forge/lib/audit-logging/formatters')

describe('Audit Log > Project', async function () {
    let sandbox

    let app
    let log
    let projectLogger

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
        getLoggers = FF_UTIL.require('forge/lib/audit-logging/project').getLoggers
    })

    beforeEach(async function () {
        // mock app & log
        log = []
        app = {
            db: {
                controllers: {
                    AuditLog: {
                        projectLog: function (app, projectId, triggerId, event, body) {
                            log.push({ app, projectId, triggerId, event, body })
                        }
                    }
                }
            }
        }

        projectLogger = getLoggers(app).project
    })

    after(() => {
        sandbox.restore()
    })

    const ACTIONED_BY = {}
    const TEAM = { id: '<team-id>' }
    const PROJECT = { id: '<project-id>' }
    const DEVICE = { id: '<device-id>' }
    const STACK = { id: '<stack-id>' }
    const SNAPSHOT = { id: '<snapshot-id>' }

    /*
        Project Actions
    */

    it('Provides a logger for creating a project', async function () {
        await projectLogger.created(ACTIONED_BY, null, TEAM, PROJECT)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.created')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'team', 'project')
    })

    it('Provides a logger for deleting a project', async function () {
        await projectLogger.deleted(ACTIONED_BY, null, TEAM, PROJECT)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.deleted')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'team', 'project')
    })

    it('Provides a logger for starting a project', async function () {
        await projectLogger.started(ACTIONED_BY, null, PROJECT)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.started')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'project')
    })

    it('Provides a logger for stopping a project', async function () {
        await projectLogger.stopped(ACTIONED_BY, null, PROJECT)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.stopped')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'project')
    })

    it('Provides a logger for restarting a project', async function () {
        await projectLogger.restarted(ACTIONED_BY, null, PROJECT)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.restarted')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'project')
    })

    it('Provides a logger for suspending a project', async function () {
        await projectLogger.suspended(ACTIONED_BY, null, PROJECT)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.suspended')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'project')
    })

    it('Provides a logger for importing flows into a project', async function () {
        await projectLogger.flowImported(ACTIONED_BY, null, PROJECT)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.flow-imported')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'project')
    })

    /*
        Project Device Actions
    */

    it('Provides a logger for unassigning a device from a project', async function () {
        await projectLogger.device.unassigned(ACTIONED_BY, null, PROJECT, DEVICE)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.device.unassigned')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'project', 'device')
    })

    it('Provides a logger for assigning a device from a project', async function () {
        await projectLogger.device.assigned(ACTIONED_BY, null, PROJECT, DEVICE)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.device.assigned')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'project', 'device')
    })

    it('Provides a logger for changing a stack of a project', async function () {
        await projectLogger.stack.changed(ACTIONED_BY, null, TEAM, PROJECT, STACK)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.stack.changed')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'team', 'project', 'stack')
    })

    it('Provides a logger for changing settings of a project', async function () {
        await projectLogger.settings.updated(ACTIONED_BY, null, PROJECT, [{}])
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.settings.updated')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'project', 'updates')
    })

    /*
        Project Snapshots
    */

    it('Provides a logger for recording snapshots of a project', async function () {
        await projectLogger.snapshot.created(ACTIONED_BY, null, PROJECT, SNAPSHOT)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.snapshot.created')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'project', 'snapshot')
    })

    it('Provides a logger for rolling back a snapshot of a project', async function () {
        await projectLogger.snapshot.rollback(ACTIONED_BY, null, PROJECT, SNAPSHOT)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.snapshot.rollback')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'project', 'snapshot')
    })

    it('Provides a logger for deleting a snapshot of a project', async function () {
        await projectLogger.snapshot.deleted(ACTIONED_BY, null, PROJECT, SNAPSHOT)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.snapshot.deleted')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'project', 'snapshot')
    })

    it('Provides a logger for assigning a device target to a snapshot of a project', async function () {
        await projectLogger.snapshot.deviceTargetSet(ACTIONED_BY, null, PROJECT, SNAPSHOT)
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('projectId', '<project-id>')
        should(log[0]).have.property('triggerId', '<id>')
        should(log[0]).have.property('event', 'project.snapshot.device-target-set')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.only.keys('error', 'project', 'snapshot')
    })
})
