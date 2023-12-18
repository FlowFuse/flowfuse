const should = require('should') // eslint-disable-line
const setup = require('./setup')

describe('Instance Alerts emails', function () {
    // Use standard test data.
    let app
    /** @type {localTransport} */
    let inbox = null

    before(async function () {
        app = await setup()
        inbox = app.config.email.transport
        await login('alice', 'aaPassword')
    })
    after(async function () {
        await app.close()
    })
    afterEach(async function () {
        inbox.messages = []
    })

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        app.TestObjects.tokens[username] = response.cookies[0].value
    }

    describe.only('Alerts', function () {
        it('Owner notified of crash', async function () {
            await app.auditLog.alerts.generate(app.TestObjects.instance.id, 'crashed')
            inbox.messages.should.have.length(1)
        })
        it('Crashed, via api', async function () {
            const response = await app.inject({
                method: 'POST',
                url: `/logging/${app.TestObjects.instance.id}/audit`,
                payload: {
                    event: 'crashed',
                    error: {
                        code: 'crashed',
                        error: 'instance crashed'
                    }
                },
                headers: {
                    authorization: `Bearer ${app.TestObjects.tokens.instance}`
                }
            })
            response.statusCode.should.equal(200)
            inbox.messages.should.have.length(1)
        })
        it('Owner notified of safe-mode', async function () {
            await app.auditLog.alerts.generate(app.TestObjects.instance.id, 'safe-mode')
            inbox.messages.should.have.length(1)
        })
        it('Both notified of safe-mode', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${app.TestObjects.instance.id}`,
                payload: {
                    settings: {
                        emailAlerts: {
                            recipients: 'both'
                        }
                    }
                },
                cookies: { sid: app.TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            await app.auditLog.alerts.generate(app.TestObjects.instance.id, 'crashed')
            inbox.messages.should.have.length(2)
        })
        it('Member notified of safe-mode', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${app.TestObjects.instance.id}`,
                payload: {
                    settings: {
                        emailAlerts: {
                            recipients: 'members'
                        }
                    }
                },
                cookies: { sid: app.TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            await app.auditLog.alerts.generate(app.TestObjects.instance.id, 'crashed')
            inbox.messages.should.have.length(1)
        })
    })
})
