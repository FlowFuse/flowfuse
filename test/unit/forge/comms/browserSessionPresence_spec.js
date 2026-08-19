const should = require('should') // eslint-disable-line

const setup = require('../routes/setup')

const FF_UTIL = require('flowforge-test-utils')
const { BrowserSessionPresenceHandler } = FF_UTIL.require('forge/comms/browserSessionPresence')

describe('BrowserSessionPresenceHandler', function () {
    function mockClient () {
        const handlers = {}
        return {
            on: (event, callback) => {
                handlers[event] = callback
            },
            emit: function () {
                const evt = arguments[0]
                const args = Array.prototype.slice.call(arguments, 1)
                if (handlers[evt]) {
                    handlers[evt].apply(null, args)
                }
            }
        }
    }

    let app
    let client
    let handler

    before(async function () {
        app = await setup()
    })

    after(async function () {
        await app.close()
    })

    beforeEach(function () {
        client = mockClient()
        handler = BrowserSessionPresenceHandler(app, client)
    })

    describe('event handler registration', function () {
        it('registers a tab-presence listener on the client', function () {
            const testClient = mockClient()
            const listeners = []
            testClient.on = (event) => { listeners.push(event) }
            BrowserSessionPresenceHandler(app, testClient)
            listeners.should.containEql('tab-presence')
        })
    })

    describe('heartbeat handling', function () {
        it('creates a cache entry with lastSeen and visibility', async function () {
            client.emit('tab-presence', {
                userId: 'user1',
                sessionId: 'session1',
                messageType: 'heartbeat',
                payload: { visibility: 'visible' }
            })

            // Allow async handler to complete
            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user1')
            sessions.should.have.length(1)
            sessions[0].should.have.property('userId', 'user1')
            sessions[0].should.have.property('sessionId', 'session1')
            sessions[0].should.have.property('visibility', 'visible')
            sessions[0].should.have.property('lastSeen').which.is.a.Number()
        })

        it('defaults visibility to visible when not provided', async function () {
            client.emit('tab-presence', {
                userId: 'user1',
                sessionId: 'session2',
                messageType: 'heartbeat',
                payload: {}
            })

            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user1')
            const session = sessions.find(s => s.sessionId === 'session2')
            session.should.have.property('visibility', 'visible')
        })

        it('preserves existing context when updating with heartbeat', async function () {
            // First set context
            client.emit('tab-presence', {
                userId: 'user2',
                sessionId: 'session1',
                messageType: 'context',
                payload: { teamId: 'team1', pageName: 'instances' }
            })
            await new Promise(resolve => setImmediate(resolve))

            // Then send heartbeat
            client.emit('tab-presence', {
                userId: 'user2',
                sessionId: 'session1',
                messageType: 'heartbeat',
                payload: { visibility: 'hidden' }
            })
            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user2')
            sessions.should.have.length(1)
            sessions[0].should.have.property('visibility', 'hidden')
            sessions[0].should.have.property('context').which.deepEqual({ teamId: 'team1', pageName: 'instances' })
        })
    })

    describe('context handling', function () {
        it('creates a cache entry with context payload', async function () {
            client.emit('tab-presence', {
                userId: 'user3',
                sessionId: 'session1',
                messageType: 'context',
                payload: { teamId: 'team1', instanceId: 'inst1', pageName: 'editor' }
            })

            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user3')
            sessions.should.have.length(1)
            sessions[0].should.have.property('context').which.deepEqual({
                teamId: 'team1',
                instanceId: 'inst1',
                pageName: 'editor'
            })
            sessions[0].should.have.property('lastSeen').which.is.a.Number()
        })

        it('updates lastSeen on context update', async function () {
            client.emit('tab-presence', {
                userId: 'user4',
                sessionId: 'session1',
                messageType: 'heartbeat',
                payload: { visibility: 'visible' }
            })
            await new Promise(resolve => setImmediate(resolve))

            const before = (await handler.getSessionsByUser('user4'))[0].lastSeen

            // Small delay to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 10))

            client.emit('tab-presence', {
                userId: 'user4',
                sessionId: 'session1',
                messageType: 'context',
                payload: { teamId: 'team2' }
            })
            await new Promise(resolve => setImmediate(resolve))

            const after = (await handler.getSessionsByUser('user4'))[0].lastSeen
            after.should.be.greaterThanOrEqual(before)
        })
    })

    describe('unknown messageType', function () {
        it('ignores unknown message types', async function () {
            client.emit('tab-presence', {
                userId: 'user5',
                sessionId: 'session1',
                messageType: 'invalid',
                payload: { some: 'data' }
            })

            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user5')
            sessions.should.have.length(0)
        })
    })

    describe('getSessionsByUser', function () {
        it('returns only sessions for the requested user', async function () {
            client.emit('tab-presence', {
                userId: 'userA',
                sessionId: 'sessionA1',
                messageType: 'heartbeat',
                payload: { visibility: 'visible' }
            })
            client.emit('tab-presence', {
                userId: 'userA',
                sessionId: 'sessionA2',
                messageType: 'heartbeat',
                payload: { visibility: 'hidden' }
            })
            client.emit('tab-presence', {
                userId: 'userB',
                sessionId: 'sessionB1',
                messageType: 'heartbeat',
                payload: { visibility: 'visible' }
            })

            await new Promise(resolve => setImmediate(resolve))

            const sessionsA = await handler.getSessionsByUser('userA')
            sessionsA.should.have.length(2)
            sessionsA.every(s => s.userId === 'userA').should.be.true()

            const sessionsB = await handler.getSessionsByUser('userB')
            sessionsB.should.have.length(1)
            sessionsB[0].should.have.property('userId', 'userB')
        })

        it('returns empty array for unknown user', async function () {
            const sessions = await handler.getSessionsByUser('nonexistent')
            sessions.should.have.length(0)
        })
    })
})
