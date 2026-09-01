const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const dashboardAdoptionTask = require('../../../../../forge/housekeeper/tasks/dashboardAdoption')

const setup = require('../setup')

const DASHBOARD_MODULE = '@flowfuse/node-red-dashboard'

function runtimeSettings (modules = {}) {
    return JSON.stringify({
        instanceId: 'abc123',
        nodes: {
            'node-red': { name: 'node-red', version: '4.1.6', local: false },
            ...modules
        }
    })
}

describe('Dashboard Adoption Task', function () {
    /** @type {import('../setup').TestApplication} */
    let app
    let instances
    let telemetryDisabled

    async function createInstanceWithSettings (name, settings) {
        const instance = await app.factory.createInstance(
            { name },
            app.application,
            app.stack,
            app.template,
            app.projectType,
            { start: false }
        )
        await app.db.models.StorageSettings.create({ settings, ProjectId: instance.id })
        return instance
    }

    before(async function () {
        telemetryDisabled = process.env.FF_TELEMETRY_DISABLED
        app = await setup({
            telemetry: { enabled: true, frontend: { posthog: { apikey: 'phc_test' } } }
        })
        // setup() upserts the model directly, bypassing the in-memory settings cache
        await app.settings.set('setup:initialised', true)
        instances = {
            withDashboard: await createInstanceWithSettings('has-dashboard', runtimeSettings({
                [DASHBOARD_MODULE]: { version: '1.2.3', local: true }
            })),
            notLocal: await createInstanceWithSettings('dashboard-not-local', runtimeSettings({
                [DASHBOARD_MODULE]: { version: '1.2.3', local: false }
            })),
            withoutDashboard: await createInstanceWithSettings('no-dashboard', runtimeSettings())
        }
    })

    after(async function () {
        process.env.FF_TELEMETRY_DISABLED = telemetryDisabled
        await app.close()
    })

    beforeEach(async function () {
        // setupApp() sets FF_TELEMETRY_DISABLED, which would suppress the task
        delete process.env.FF_TELEMETRY_DISABLED
        sinon.stub(app.product, 'capture')
    })

    afterEach(async function () {
        app.product.capture.restore()
        await app.settings.set('telemetry:enabled', true)
    })

    it('reports the share of instances with the dashboard module loaded', async function () {
        await dashboardAdoptionTask.run(app)

        app.product.capture.calledOnce.should.be.true()
        const [distinctId, event, properties] = app.product.capture.firstCall.args
        distinctId.should.equal(app.settings.get('instanceId'))
        event.should.equal('$ff-dashboard-adoption')
        properties.should.match({ with_dashboard: 1, total: 3, pct: 33.3 })
    })

    it('excludes suspended instances', async function () {
        instances.withDashboard.state = 'suspended'
        await instances.withDashboard.save()

        await dashboardAdoptionTask.run(app)

        const [, , properties] = app.product.capture.firstCall.args
        properties.should.match({ with_dashboard: 0, total: 2, pct: 0 })

        instances.withDashboard.state = 'running'
        await instances.withDashboard.save()
    })

    it('does not report when an unlicensed platform has disabled telemetry', async function () {
        // settings.get('telemetry:enabled') is forced to true while licensed
        sinon.stub(app.license, 'active').returns(false)
        await app.settings.set('telemetry:enabled', false)

        try {
            await dashboardAdoptionTask.run(app)
        } finally {
            app.license.active.restore()
        }

        app.product.capture.called.should.be.false()
    })

    it('does not report when FF_TELEMETRY_DISABLED is set', async function () {
        process.env.FF_TELEMETRY_DISABLED = true

        try {
            await dashboardAdoptionTask.run(app)
        } finally {
            delete process.env.FF_TELEMETRY_DISABLED
        }

        app.product.capture.called.should.be.false()
    })

    it('does not report before the platform has been set up', async function () {
        await app.settings.set('setup:initialised', false)

        try {
            await dashboardAdoptionTask.run(app)
        } finally {
            await app.settings.set('setup:initialised', true)
        }

        app.product.capture.called.should.be.false()
    })
})
