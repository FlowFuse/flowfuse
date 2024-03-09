const sleep = require('util').promisify(setTimeout)

const should = require('should') // eslint-disable-line
const sinon = require('sinon')
const WebSocket = require('ws')

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')

const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Device Editor API', function () {
    let app
    const TestObjects = { tokens: {} }

    before(async function () {
        app = await setup({ })
        await login('alice', 'aaPassword')

        app.device = await app.factory.createDevice({
            name: 'device1',
            mode: 'developer'
        }, app.team, app.instance)

        app.failingDevice = await app.factory.createDevice({
            name: 'failingDevice'
        }, app.team, app.instance)

        const userBob = await app.factory.createUser({
            username: 'bob',
            name: 'Bob',
            email: 'bob@example.com',
            password: 'bbPassword'
        })
        await login('bob', 'bbPassword')

        const team2 = await app.factory.createTeam({ name: 'BTeam' })
        await team2.addUser(userBob, { through: { role: Roles.Owner } })

        sinon.stub(app.comms.devices, 'enableEditor').callsFake(async function (teamId, deviceId, accessToken) {
            if (deviceId === app.failingDevice.hashid) {
                return {
                    error: true
                }
            }
            TestObjects.tokens[deviceId] = accessToken
            return {}
        })

        sinon.stub(app.comms.devices, 'disableEditor').callsFake(async function (teamId, deviceId) {
            delete TestObjects.tokens[deviceId]
            return {}
        })

        // Need to actually listen on a port so we can test websockets
        await app.listen({ port: 0 })
    })

    after(async function () {
        await app.close()
    })

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    async function getDeviceEditorStatus (device, token) {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/devices/${device}`,
            cookies: { sid: token }
        })
        response.statusCode.should.equal(200)
        return JSON.parse(response.body).editor || { enabled: false }
    }

    async function setDeviceEditorStatus (device, token, enabled) {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/devices/${device}/editor`,
            payload: {
                enabled
            },
            cookies: { sid: token }
        })
        response.statusCode.should.equal(200)
        return JSON.parse(response.body)
    }
    describe('editor mode', function () {
        it('get the device editor status', async function () {
            const result = await getDeviceEditorStatus(app.device.hashid, TestObjects.tokens.alice)
            result.should.have.property('enabled', false)
        })

        it('enable editor mode fails if device does not respond', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/devices/${app.failingDevice.hashid}/editor`,
                payload: {
                    enabled: true
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(503)
            const result = JSON.parse(response.body)
            result.should.have.property('enabled', false)
            result.should.have.property('error')
            result.should.have.property('code')
        })

        it('Recreates the tunnel upon enablement when the tunnel is open but connected state is `false', async function () {
            // first enable the tunnel
            const result = await setDeviceEditorStatus(app.device.hashid, TestObjects.tokens.alice, true)
            result.should.have.property('enabled', true)
            result.should.have.property('connected', false)
            // now watch for `tunnelManager.closeTunnel` then `tunnelManager.newTunnel` being called
            const closeTunnelSpy = sinon.spy(app.comms.devices.tunnelManager, 'closeTunnel')
            // now enable the tunnel again
            const result2 = await setDeviceEditorStatus(app.device.hashid, TestObjects.tokens.alice, true)
            result2.should.have.property('enabled', true)
            // check that the tunnel was closed and re-created
            closeTunnelSpy.calledWith(app.device.hashid).should.equal(true)
        })

        it('enable editor mode', async function () {
            const result = await setDeviceEditorStatus(app.device.hashid, TestObjects.tokens.alice, true)
            result.should.have.property('enabled', true)
            result.should.have.property('connected', false)
            result.should.have.property('url')
            TestObjects.tokens.should.have.property(app.device.hashid)
        })

        it('can enable an already enabled editor mode', async function () {
            const result = await setDeviceEditorStatus(app.device.hashid, TestObjects.tokens.alice, true)
            result.should.have.property('enabled', true)
            result.should.have.property('connected', false)
            result.should.have.property('url')
            TestObjects.tokens.should.have.property(app.device.hashid)
        })

        it('disable editor mode', async function () {
            const result = await setDeviceEditorStatus(app.device.hashid, TestObjects.tokens.alice, false)
            result.should.have.property('enabled', false)
            result.should.not.have.property('connected')
            result.should.not.have.property('url')
            TestObjects.tokens.should.not.have.property(app.device.hashid)
        })

        it('can disable and already disabled editor mode', async function () {
            const result = await setDeviceEditorStatus(app.device.hashid, TestObjects.tokens.alice, false)
            result.should.have.property('enabled', false)
            result.should.not.have.property('connected')
            result.should.not.have.property('url')
            TestObjects.tokens.should.not.have.property(app.device.hashid)
        })
    })

    describe('device comms ws', function () {
        it('device websocket cannot connect if device editor not enabled', async function () {
            const result = await getDeviceEditorStatus(app.device.hashid, TestObjects.tokens.alice)
            result.should.have.property('enabled', false)

            const ws = new WebSocket(`ws://localhost:${app.server.address().port}/api/v1/devices/${app.device.hashid}/editor/comms/ABCED`)

            let closeReason, closeCode

            ws.on('error', function () { })
            ws.on('close', function (code, reason) {
                closeCode = code
                closeReason = reason?.toString() || ''
            })

            await sleep(200)

            ws.readyState.should.equal(WebSocket.CLOSED)
            closeCode.should.equal(4004)
            closeReason.should.equal('No tunnel')
        })
        it('device websocket cannot connect with incorrect token', async function () {
            const enableResult = await setDeviceEditorStatus(app.device.hashid, TestObjects.tokens.alice, true)
            enableResult.should.have.property('enabled', true)

            const ws = new WebSocket(`ws://localhost:${app.server.address().port}/api/v1/devices/${app.device.hashid}/editor/comms/ABCED`)

            let closeReason, closeCode

            ws.on('error', function () { })
            ws.on('close', function (code, reason) {
                closeCode = code
                closeReason = reason?.toString() || ''
            })

            await sleep(200)

            ws.readyState.should.equal(WebSocket.CLOSED)
            closeCode.should.equal(4001)
            closeReason.should.equal('Invalid token')
        })
        it('Proxy HTTP GET - fails if device ws not connected', async function () {
            const status = await setDeviceEditorStatus(app.device.hashid, TestObjects.tokens.alice, true)
            status.should.have.property('connected', false)
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${app.device.hashid}/editor/proxy/GET`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(502)
        })
        it('Proxy HTTP PUT - fails if device ws not connected', async function () {
            // Only checking PUT as it shares the same route handler as the other
            // non-GET methods
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/devices/${app.device.hashid}/editor/proxy/PUT`,
                payload: { a: 1 },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(502)
        })

        describe('device websocket can connect with correct token', async function () {
            let ws
            it('connects the websocket', async function () {
                await setDeviceEditorStatus(app.device.hashid, TestObjects.tokens.alice, true)
                // We should still have the valid token from the previous test
                TestObjects.tokens.should.have.property(app.device.hashid)
                const token = TestObjects.tokens[app.device.hashid]
                ws = new WebSocket(`ws://localhost:${app.server.address().port}/api/v1/devices/${app.device.hashid}/editor/comms/${token}`)

                ws.on('error', function () { })
                ws.on('message', payload => {
                    const msg = JSON.parse(payload.toString())
                    ws.send(JSON.stringify({
                        id: msg.id,
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify(msg),
                        status: 200
                    }))
                })

                await sleep(200)

                ws.readyState.should.equal(WebSocket.OPEN)

                const result = await getDeviceEditorStatus(app.device.hashid, TestObjects.tokens.alice)
                result.should.have.property('enabled', true)
                result.should.have.property('connected', true)
            })

            it('Proxy HTTP GET - fails without valid user token', async function () {
                const noCookieResponse = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${app.device.hashid}/editor/proxy/GET`
                })
                noCookieResponse.statusCode.should.equal(303)
                const wrongTeamResponse = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${app.device.hashid}/editor/proxy/GET`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                wrongTeamResponse.statusCode.should.equal(303)
            })
            it('Proxy HTTP PUT - fails without valid user token', async function () {
                const noCookieResponse = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${app.device.hashid}/editor/proxy/PUT`,
                    payload: { a: 1 }
                })
                noCookieResponse.statusCode.should.equal(303)
                const wrongTeamResponse = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${app.device.hashid}/editor/proxy/PUT`,
                    payload: { a: 1 },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                wrongTeamResponse.statusCode.should.equal(303)
            })

            it('Proxy HTTP GET - succeeds', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${app.device.hashid}/editor/proxy/GET`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = JSON.parse(response.body)
                result.should.have.property('method', 'GET')
                result.should.have.property('headers')
                result.should.have.property('url', '/GET')
            })
            it('Proxy HTTP PUT - succeeds', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${app.device.hashid}/editor/proxy/PUT`,
                    payload: { a: 1 },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = JSON.parse(response.body)
                result.should.have.property('method', 'PUT')
                result.should.have.property('headers')
                result.should.have.property('url', '/PUT')
                result.should.have.property('body', '{"a":1}')
            })
            it('Proxy HTTP POST - succeeds', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/devices/${app.device.hashid}/editor/proxy/POST`,
                    payload: { a: 1 },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = JSON.parse(response.body)
                result.should.have.property('method', 'POST')
                result.should.have.property('headers')
                result.should.have.property('url', '/POST')
                result.should.have.property('body', '{"a":1}')
            })
            it('Proxy HTTP DELETE - succeeds', async function () {
                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/devices/${app.device.hashid}/editor/proxy/DELETE`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = JSON.parse(response.body)
                result.should.have.property('method', 'DELETE')
                result.should.have.property('headers')
                result.should.have.property('url', '/DELETE')
            })

            it('disconnects the websocket when device mode disabled', async function () {
                const result = await setDeviceEditorStatus(app.device.hashid, TestObjects.tokens.alice, false)
                result.should.have.property('enabled', false)
                await sleep(100)
                ws.readyState.should.equal(WebSocket.CLOSED)
            })

            it.skip('editor websocket handling')
        })
        it.skip('GET /api/v1/devices/:deviceId/editor/token')
    })
})
