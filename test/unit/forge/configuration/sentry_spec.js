const Sentry = require('@sentry/node')
const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const FF_UTIL = require('flowforge-test-utils')

describe('Backend Sentry setup', () => {
    let app

    beforeEach(function () {
        sinon.stub(Sentry, 'init')
        sinon.stub(Sentry, 'setupFastifyErrorHandler')
    })

    afterEach(async function () {
        if (app) {
            await app.close()
            app = null
        }
        sinon.restore()
    })

    it('initialises Sentry when a backend DSN is configured', async function () {
        app = await FF_UTIL.setupApp({
            housekeeper: false,
            telemetry: {
                enabled: false,
                backend: {
                    sentry: {
                        dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0'
                    }
                }
            }
        })

        Sentry.init.calledOnce.should.be.true()
        const initOptions = Sentry.init.firstCall.args[0]
        initOptions.should.have.property('dsn', 'https://examplePublicKey@o0.ingest.sentry.io/0')
        initOptions.should.have.property('sendClientReports', true)
        initOptions.should.have.property('environment')
        initOptions.release.should.match(/^flowfuse@/)

        Sentry.setupFastifyErrorHandler.calledOnce.should.be.true()
        Sentry.setupFastifyErrorHandler.firstCall.args[0].should.equal(app)
    })

    it('does not initialise Sentry when no backend DSN is configured', async function () {
        app = await FF_UTIL.setupApp({
            housekeeper: false,
            telemetry: {
                enabled: false
            }
        })

        Sentry.init.called.should.be.false()
        Sentry.setupFastifyErrorHandler.called.should.be.false()
    })
})
