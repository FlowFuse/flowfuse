const sinon = require('sinon')

const should = require('should') // eslint-disable-line
require('should-sinon')
const FF_UTIL = require('flowforge-test-utils')
const Formatters = FF_UTIL.require('forge/lib/audit-logging/formatters')

describe('Audit Log > Platform', async function () {
    let sandbox
    let app
    let log
    let platform

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
        getLoggers = FF_UTIL.require('forge/lib/audit-logging/platform').getLoggers
    })

    beforeEach(async function () {
        // mock app & log
        log = []
        app = {
            db: {
                controllers: {
                    AuditLog: {
                        platformLog: function (app, trigger, event, body) {
                            log.push({ app, trigger, event, body })
                        }
                    }
                }
            }
        }

        platform = getLoggers(app).platform
    })

    after(() => {
        sandbox.restore()
    })

    const ACTIONED_BY = {}

    it('Provides a logger for platform settings', async function () {
        await platform.settings.updated(ACTIONED_BY, null, [{}])
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('trigger', '<id>')
        should(log[0]).have.property('event', 'platform.settings.updated')
        should(log[0]).have.property('body')
        should(log[0].body).have.property('error', null)
        should(log[0].body).have.property('updates')
    })

    it('Provides a logger for creating platform stacks', async function () {
        // platform - stack - create
        await platform.stack.created(ACTIONED_BY, null, [{}])
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('trigger', '<id>')
        should(log[0]).have.property('event', 'platform.stack.created')
        should(log[0]).have.property('body')
        should(log[0].body).have.only.keys('error', 'stack')
    })

    it('Provides a logger for deleting platform stacks', async function () {
        // platform - stack - delete
        await platform.stack.deleted(ACTIONED_BY, null, [{}])
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('trigger', '<id>')
        should(log[0]).have.property('event', 'platform.stack.deleted')
        should(log[0]).have.property('body')
        should(log[0].body).have.only.keys('error', 'stack')
    })

    it('Provides a logger for updating platform stacks', async function () {
        // platform - stack - update
        await platform.stack.updated(ACTIONED_BY, null, {})
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('trigger', '<id>')
        should(log[0]).have.property('event', 'platform.stack.updated')
        should(log[0]).have.property('body')
        should(log[0].body).have.only.keys('error', 'stack', 'updates')
    })

    it('Provides a logger for creating platform projectTypes', async function () {
        // platform - stack - create
        await platform.projectType.created(ACTIONED_BY, null, {})
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('trigger', '<id>')
        should(log[0]).have.property('event', 'platform.project-type.created')
        should(log[0]).have.property('body')
        should(log[0].body).have.only.keys('error', 'projectType')
    })

    it('Provides a logger for deleting platform projectTypes', async function () {
        // platform - stack - delete
        await platform.projectType.deleted(ACTIONED_BY, null, {})
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('trigger', '<id>')
        should(log[0]).have.property('event', 'platform.project-type.deleted')
        should(log[0]).have.property('body')
        should(log[0].body).have.only.keys('error', 'projectType')
    })

    it('Provides a logger for updating platform projectTypes', async function () {
        // platform - stack - update
        await platform.projectType.updated(ACTIONED_BY, null, [{}])
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('trigger', '<id>')
        should(log[0]).have.property('event', 'platform.project-type.updated')
        should(log[0]).have.property('body')
        should(log[0].body).have.only.keys('error', 'projectType', 'updates')
    })

    it('Provides a logger for applying a platform license', async function () {
        // platform - stack - update
        await platform.license.applied(ACTIONED_BY, null, {})
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('trigger', '<id>')
        should(log[0]).have.property('event', 'platform.license.applied')
        should(log[0]).have.property('body')
        should(log[0].body).have.only.keys('error', 'license')
    })

    it('Provides a logger for inspecting a platform license', async function () {
        // platform - stack - update
        await platform.license.inspected(ACTIONED_BY, null, {})
        // check dependency fcns are called
        genBodyStub.should.be.called()
        triggerObjectStub.should.be.calledWith(ACTIONED_BY)
        // check log stored
        should(log).have.property('length', 1)
        should(log[0]).have.property('trigger', '<id>')
        should(log[0]).have.property('event', 'platform.license.inspected')
        should(log[0]).have.property('body')
        should(log[0].body).have.only.keys('error', 'license')
    })
})
