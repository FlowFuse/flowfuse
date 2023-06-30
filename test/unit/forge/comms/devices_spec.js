const sleep = require('util').promisify(setTimeout)

const should = require('should') // eslint-disable-line
const setup = require('../routes/setup')

const FF_UTIL = require('flowforge-test-utils')
const { DeviceCommsHandler } = FF_UTIL.require('forge/comms/devices')

describe('DeviceCommsHandler', function () {
    let app
    const TestObjects = {}

    async function setupCE () {
        app = await setup()
        await setupTestObjects()
    }

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

    async function setupTestObjects () {
        // alice : admin
        // ATeam ( alice  (owner) )

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        // Alice set as ATeam owner in setup()

        TestObjects.ProjectA = app.project
        TestObjects.ProjectACredentials = await TestObjects.ProjectA.refreshAuthTokens()

        TestObjects.device = await app.factory.createDevice({
            name: 'device1'
        }, TestObjects.ATeam)

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
    }

    before(async function () {
        return setupCE()
    })
    after(async function () {
        await app.close()
    })
    /**
     * Get a mocked websocket/socket object. They are 99% the same for the purposes
     * of our tests - only different being one uses 'publish' and one uses 'send'
     */
    function mockSocket () {
        let received = []
        const handlers = {}
        return {
            publish: (topic, payload) => {
                received.push({ topic, payload })
            },
            send: (data) => {
                received.push(data)
            },
            on: (event, callback) => {
                handlers[event] = callback
            },
            emit: function () {
                const evt = arguments[0]
                const args = Array.prototype.slice.call(arguments, 1)
                handlers[evt].apply(null, args)
            },
            received: () => received,
            clearReceived: () => { received = [] }
        }
    }

    describe('Device Logs', function () {
        let commsHandler
        let client
        const sockets = []
        before(function () {
            client = mockSocket()
            commsHandler = DeviceCommsHandler(app, client)
        })

        it('tells a device to start streaming logs', async function () {
            sockets.push(mockSocket())
            commsHandler.streamLogs(TestObjects.ATeam.hashid, TestObjects.device.hashid, sockets[0])

            client.received().should.have.length(1)
            const msg = client.received()[0]
            msg.should.have.property('topic', `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.device.hashid}/command`)
            msg.should.have.property('payload')
            const payload = JSON.parse(msg.payload)
            payload.should.have.property('command', 'startLog')
            client.clearReceived()
        })
        it('streams logs to socket', async function () {
            client.emit('logs/device', {
                id: TestObjects.device.hashid,
                logs: 'm1'
            })
            sockets[0].received().should.have.length(1)
            sockets[0].received()[0].should.equal('m1')
            sockets[0].clearReceived()
        })
        it('supports multiple active ws connections', async function () {
            sockets.push(mockSocket())
            commsHandler.streamLogs(TestObjects.ATeam.hashid, TestObjects.device.hashid, sockets[1])
            // Already streaming, so should not trigger another command
            client.received().should.have.length(0)

            client.emit('logs/device', {
                id: TestObjects.device.hashid,
                logs: 'm2'
            })
            sockets[0].received().should.have.length(1)
            sockets[0].received()[0].should.equal('m2')
            sockets[0].clearReceived()
            // New socket should receive previous messages
            sockets[1].received().should.have.length(2)
            sockets[1].received()[0].should.equal('m1')
            sockets[1].received()[1].should.equal('m2')
            sockets[1].clearReceived()
        })
        it('handles socket close', async function () {
            // Close sockets[1] - verify sockets[0] still gets messages
            sockets[1].emit('close')
            // Still got an active socket, so no command should be sent
            client.received().should.have.length(0)

            client.emit('logs/device', {
                id: TestObjects.device.hashid,
                logs: 'm3'
            })
            // Existing socket should still receive it
            sockets[0].received().should.have.length(1)
            sockets[0].clearReceived()
            sockets[1].received().should.have.length(0)
        })
        it('caches last 10 messages', async function () {
            // Send 8 more messages so 11 have been sent in total
            for (let i = 4; i < 12; i++) {
                client.emit('logs/device', {
                    id: TestObjects.device.hashid,
                    logs: `m${i}`
                })
            }
            // soc0 already received m1-m3
            sockets[0].received().should.have.length(8)
            sockets[0].clearReceived()

            // soc2
            sockets.push(mockSocket())
            commsHandler.streamLogs(TestObjects.ATeam.hashid, TestObjects.device.hashid, sockets[2])
            // Already streaming, so should not trigger another command
            client.received().should.have.length(0)

            await sleep(50)
            // Should only have received 10 messages, starting with m2
            sockets[2].received().should.have.length(10)
            sockets[2].received()[0].should.equal('m2')
            sockets[2].received()[9].should.equal('m11')

            // Close the socket
            sockets[2].emit('close')
            await sleep(10)
        })

        it('handles socket close - last remaining', async function () {
            // Close sockets[0] - verify command sent to stop
            sockets[0].emit('close')
            // Still got an active socket, so no command should be sent
            client.received().should.have.length(1)
            const msg = client.received()[0]
            msg.should.have.property('topic', `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.device.hashid}/command`)
            msg.should.have.property('payload')
            const payload = JSON.parse(msg.payload)
            payload.should.have.property('command', 'stopLog')
            client.clearReceived()
        })
        it('tells a device to stop if it sends logs without active sockets', async function () {
            client.emit('logs/device', {
                id: TestObjects.device.hashid,
                logs: 'mxx'
            })
            // This task happens asynchronously - so need to give it a chance
            // to happen
            await sleep(100)
            const msg = client.received()[0]
            msg.should.have.property('topic', `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.device.hashid}/command`)
            msg.should.have.property('payload')
            const payload = JSON.parse(msg.payload)
            payload.should.have.property('command', 'stopLog')

            sockets[0].received().should.have.length(0)
            sockets[1].received().should.have.length(0)
        })
    })
})
