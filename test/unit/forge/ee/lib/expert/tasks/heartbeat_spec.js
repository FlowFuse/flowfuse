const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const FF_UTIL = require('flowforge-test-utils')

// heartbeat.js does `const { syncBridge } = require('../emxq-bridge/setup.js')` at require-time,
// so the module's export must be stubbed *before* heartbeat.js is first required here - otherwise
// the destructured reference inside heartbeat.js would still point at the real implementation.
const bridgeSetup = FF_UTIL.require('forge/ee/lib/expert/emxq-bridge/setup.js')
const syncBridgeStub = sinon.stub(bridgeSetup, 'syncBridge')

const heartbeatTaskFactory = FF_UTIL.require('forge/ee/lib/expert/tasks/heartbeat.js')

describe('Expert Agent bridge heartbeat task', function () {
    // A minimal fake `app` - just the bits the task's run() function touches
    function makeApp (overrides = {}) {
        return {
            comms: {
                expert: {
                    requestBridgeHeartbeat: overrides.requestBridgeHeartbeat || sinon.stub()
                }
            },
            log: {
                error: sinon.stub(),
                warn: sinon.stub(),
                info: sinon.stub()
            }
        }
    }

    // Runs task.run(app), fast-forwarding past its startDelay gate and the internal random
    // (0-999ms) jitter sleep via fake timers, so the test doesn't have to wait on a real
    // wall-clock delay.
    async function runTask (task, app) {
        const clock = sinon.useFakeTimers({ now: Date.now() + 5000, toFake: ['setTimeout', 'Date'] })
        const runPromise = task.run(app)
        await clock.tickAsync(1000)
        await runPromise
        clock.restore()
    }

    afterEach(function () {
        syncBridgeStub.resetHistory()
        syncBridgeStub.resolves()
    })

    after(function () {
        // Leave the shared emxq-bridge/setup module in its original state for any other
        // spec file that runs later in this same mocha process.
        syncBridgeStub.restore()
    })

    describe('factory validation', function () {
        it('creates a task with the expected defaults when called with no options', function () {
            const task = heartbeatTaskFactory()
            task.should.have.property('name', 'EmqxExpertBridgeHeartbeat')
            task.should.have.property('startup', false)
            task.schedule.should.be.a.String()
            task.run.should.be.a.Function()
        })

        it('uses the provided schedule verbatim', function () {
            const task = heartbeatTaskFactory({ schedule: '0 0 * * * *' })
            task.schedule.should.equal('0 0 * * * *')
        })

        it('treats an explicit startDelay of 0 as "no delay" (not "not provided")', async function () {
            const task = heartbeatTaskFactory({ startDelay: 0, maxResponseTime: 5000, schedule: '0 0 * * * *' })
            const app = makeApp()

            await runTask(task, app)

            app.comms.expert.requestBridgeHeartbeat.calledOnce.should.be.true()
        })

        it('defaults startDelay to 2 minutes when not provided', async function () {
            const task = heartbeatTaskFactory({ schedule: '0 0 * * * *' })
            const app = makeApp()

            await task.run(app)

            app.comms.expert.requestBridgeHeartbeat.called.should.be.false()
        })

        it('throws a RangeError for a negative startDelay', function () {
            should(() => heartbeatTaskFactory({ startDelay: -1 })).throw(RangeError)
        })

        it('throws a RangeError for a negative maxResponseTime', function () {
            should(() => heartbeatTaskFactory({ maxResponseTime: -1 })).throw(RangeError)
        })

        it('throws a RangeError for a negative maxSuccessiveFailureCount', function () {
            should(() => heartbeatTaskFactory({ maxSuccessiveFailureCount: -1 })).throw(RangeError)
        })

        it('throws for an invalid cron expression', function () {
            should(() => heartbeatTaskFactory({ schedule: 'not-a-cron-expression' })).throw()
        })

        it('throws when the schedule is too frequent relative to maxResponseTime', function () {
            // every second, but the default maxResponseTime (10s) requires >= 20s between runs
            should(() => heartbeatTaskFactory({ schedule: '* * * * * *' })).throw(/too frequent/)
        })
    })

    describe('run()', function () {
        it('does not request a heartbeat before startDelay has elapsed', async function () {
            const task = heartbeatTaskFactory({ startDelay: 60000, schedule: '0 0 * * * *' })
            const app = makeApp()

            await task.run(app)

            app.comms.expert.requestBridgeHeartbeat.called.should.be.false()
        })

        it('requests a heartbeat once startDelay has elapsed', async function () {
            const task = heartbeatTaskFactory({ startDelay: 0, maxResponseTime: 5000, schedule: '0 0 * * * *' })
            const app = makeApp()

            await runTask(task, app)

            app.comms.expert.requestBridgeHeartbeat.calledOnce.should.be.true()
            const [maxResponseTime, callback] = app.comms.expert.requestBridgeHeartbeat.firstCall.args
            maxResponseTime.should.equal(5000)
            callback.should.be.a.Function()
        })

        it('does not re-sync the bridge when the heartbeat succeeds', async function () {
            const task = heartbeatTaskFactory({ startDelay: 0, maxSuccessiveFailureCount: 3, schedule: '0 0 * * * *' })
            const app = makeApp()
            await runTask(task, app)

            const [, callback] = app.comms.expert.requestBridgeHeartbeat.firstCall.args
            await callback(null, { errorCount: 0 })

            syncBridgeStub.called.should.be.false()
        })

        it('does not re-sync the bridge while errorCount is below maxSuccessiveFailureCount', async function () {
            const task = heartbeatTaskFactory({ startDelay: 0, maxSuccessiveFailureCount: 3, schedule: '0 0 * * * *' })
            const app = makeApp()
            await runTask(task, app)

            const [, callback] = app.comms.expert.requestBridgeHeartbeat.firstCall.args
            await callback(new Error('heartbeat missed'), { errorCount: 2 })

            syncBridgeStub.called.should.be.false()
        })

        it('re-syncs the bridge once errorCount reaches a multiple of maxSuccessiveFailureCount', async function () {
            const task = heartbeatTaskFactory({ startDelay: 0, maxSuccessiveFailureCount: 3, schedule: '0 0 * * * *' })
            const app = makeApp()
            await runTask(task, app)

            const [, callback] = app.comms.expert.requestBridgeHeartbeat.firstCall.args
            await callback(new Error('heartbeat missed'), { errorCount: 3 })

            syncBridgeStub.calledOnce.should.be.true()
            syncBridgeStub.firstCall.args[0].should.equal(app)
            syncBridgeStub.firstCall.args[1].should.deepEqual({ force: true })
        })

        it('re-syncs again at the next multiple of maxSuccessiveFailureCount', async function () {
            const task = heartbeatTaskFactory({ startDelay: 0, maxSuccessiveFailureCount: 3, schedule: '0 0 * * * *' })
            const app = makeApp()
            await runTask(task, app)

            const [, callback] = app.comms.expert.requestBridgeHeartbeat.firstCall.args
            await callback(new Error('heartbeat missed'), { errorCount: 3 })
            await callback(new Error('heartbeat missed'), { errorCount: 6 })

            syncBridgeStub.calledTwice.should.be.true()
        })

        it('logs but does not throw when re-synchronizing the bridge fails', async function () {
            syncBridgeStub.rejects(new Error('sync boom'))
            const task = heartbeatTaskFactory({ startDelay: 0, maxSuccessiveFailureCount: 3, schedule: '0 0 * * * *' })
            const app = makeApp()
            await runTask(task, app)

            const [, callback] = app.comms.expert.requestBridgeHeartbeat.firstCall.args
            await callback(new Error('heartbeat missed'), { errorCount: 3 })

            syncBridgeStub.calledOnce.should.be.true()
            app.log.error.calledWithMatch(/Error synchronizing bridge after heartbeat failure: sync boom/).should.be.true()
        })
    })
})
