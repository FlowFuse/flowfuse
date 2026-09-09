const should = require('should')
const sinon = require('sinon')

const setup = require('../routes/setup')

const FF_UTIL = require('flowforge-test-utils')
const { BrowserSessionLifecycleHandler } = FF_UTIL.require('forge/comms/browserSessionLifecycle')

describe('BrowserSessionLifecycleHandler', function () {
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
        handler = app.db.controllers.BrowserSession
        BrowserSessionLifecycleHandler(app, client)
    })

    describe('event handler registration', function () {
        it('registers a tab-presence listener on the client', function () {
            const testClient = mockClient()
            const listeners = []
            testClient.on = (event) => { listeners.push(event) }
            BrowserSessionLifecycleHandler(app, testClient)
            listeners.should.containEql('browser-session')
        })
    })

    describe('heartbeat handling', function () {
        it('creates a cache entry with lastSeen and visibility', async function () {
            client.emit('browser-session', {
                userId: 'user1',
                sessionId: 'session1',
                event: 'heartbeat',
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
            client.emit('browser-session', {
                userId: 'user1',
                sessionId: 'session2',
                event: 'heartbeat',
                payload: {}
            })

            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user1')
            const session = sessions.find(s => s.sessionId === 'session2')
            session.should.have.property('visibility', 'visible')
        })

        it('stores the focused flag and context carried by the heartbeat', async function () {
            client.emit('browser-session', {
                userId: 'user2',
                sessionId: 'session1',
                event: 'heartbeat',
                payload: {
                    visibility: 'hidden',
                    focused: false,
                    context: { teamId: 'team1', pageName: 'instances' }
                }
            })

            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user2')
            sessions.should.have.length(1)
            sessions[0].should.have.property('visibility', 'hidden')
            sessions[0].should.have.property('focused', false)
            sessions[0].should.have.property('context').which.deepEqual({ teamId: 'team1', pageName: 'instances' })
        })

        it('defaults focused and context to null when not provided', async function () {
            client.emit('browser-session', {
                userId: 'user3',
                sessionId: 'session1',
                event: 'heartbeat',
                payload: { visibility: 'visible' }
            })

            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user3')
            sessions[0].should.have.property('focused', null)
            sessions[0].should.have.property('context', null)
        })

        it('replaces the entry wholesale rather than merging with what is cached', async function () {
            client.emit('browser-session', {
                userId: 'user4',
                sessionId: 'session1',
                event: 'heartbeat',
                payload: {
                    visibility: 'visible',
                    focused: true,
                    context: { teamId: 'team1', pageName: 'instances' }
                }
            })
            await new Promise(resolve => setImmediate(resolve))

            // A later heartbeat without context must clear it, not preserve it. Each
            // message carries the full snapshot, so stale fields never survive.
            client.emit('browser-session', {
                userId: 'user4',
                sessionId: 'session1',
                event: 'heartbeat',
                payload: { visibility: 'hidden' }
            })
            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user4')
            sessions.should.have.length(1)
            sessions[0].should.have.property('visibility', 'hidden')
            sessions[0].should.have.property('focused', null)
            sessions[0].should.have.property('context', null)
        })

        it('updates lastSeen on each heartbeat', async function () {
            client.emit('browser-session', {
                userId: 'user5',
                sessionId: 'session1',
                event: 'heartbeat',
                payload: { visibility: 'visible' }
            })
            await new Promise(resolve => setImmediate(resolve))

            const before = (await handler.getSessionsByUser('user5'))[0].lastSeen

            // Small delay to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 10))

            client.emit('browser-session', {
                userId: 'user5',
                sessionId: 'session1',
                event: 'heartbeat',
                payload: { visibility: 'hidden' }
            })
            await new Promise(resolve => setImmediate(resolve))

            const after = (await handler.getSessionsByUser('user5'))[0].lastSeen
            after.should.be.greaterThanOrEqual(before)
        })
    })

    describe('close handling (user opted the tab out)', function () {
        it('removes the session entry', async function () {
            client.emit('browser-session', {
                userId: 'user9',
                sessionId: 'session1',
                event: 'heartbeat',
                payload: { visibility: 'visible' }
            })
            await new Promise(resolve => setImmediate(resolve))
            ;(await handler.getSessionsByUser('user9')).should.have.length(1)

            client.emit('browser-session', {
                userId: 'user9',
                sessionId: 'session1',
                event: 'close',
                payload: {}
            })
            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user9')
            sessions.should.have.length(0)
        })

        it('only removes the session named in the topic', async function () {
            client.emit('browser-session', {
                userId: 'user10',
                sessionId: 'sessionA',
                event: 'heartbeat',
                payload: { visibility: 'visible' }
            })
            client.emit('browser-session', {
                userId: 'user10',
                sessionId: 'sessionB',
                event: 'heartbeat',
                payload: { visibility: 'visible' }
            })
            await new Promise(resolve => setImmediate(resolve))

            client.emit('browser-session', {
                userId: 'user10',
                sessionId: 'sessionA',
                event: 'close',
                payload: {}
            })
            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user10')
            sessions.should.have.length(1)
            sessions[0].should.have.property('sessionId', 'sessionB')
        })

        it('is a no-op for a session that was never registered', async function () {
            client.emit('browser-session', {
                userId: 'user11',
                sessionId: 'never-seen',
                event: 'close',
                payload: {}
            })
            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user11')
            sessions.should.have.length(0)
        })
    })

    describe('disconnected handling (connection died)', function () {
        // The grace is a Date.now() comparison, so drive the clock through a stub rather than
        // wait it out. setImmediate stays real so the async cache work between steps settles.
        let now
        let nowStub

        async function settle () {
            await new Promise(resolve => setImmediate(resolve))
        }

        beforeEach(function () {
            now = 1_000_000
            nowStub = sinon.stub(Date, 'now').callsFake(() => now)
        })

        afterEach(function () {
            nowStub.restore()
        })

        it('keeps the session listed while the grace window is still open', async function () {
            client.emit('browser-session', {
                userId: 'user12',
                sessionId: 'session1',
                event: 'heartbeat',
                payload: { visibility: 'visible' }
            })
            await settle()

            client.emit('browser-session', {
                userId: 'user12',
                sessionId: 'session1',
                event: 'disconnected',
                payload: {}
            })
            await settle()

            // A reload fires the same will, so the entry must still be here for the tab to return to.
            ;(await handler.getSessionsByUser('user12')).should.have.length(1)
        })

        it('drops the session once the grace window passes with no heartbeat', async function () {
            client.emit('browser-session', {
                userId: 'user12b',
                sessionId: 'session1',
                event: 'heartbeat',
                payload: { visibility: 'visible' }
            })
            await settle()

            client.emit('browser-session', {
                userId: 'user12b',
                sessionId: 'session1',
                event: 'disconnected',
                payload: {}
            })
            await settle()

            now += 60_000

            ;(await handler.getSessionsByUser('user12b')).should.have.length(0)
        })

        it('clears the disconnect flag when the tab reconnects and heartbeats', async function () {
            client.emit('browser-session', {
                userId: 'user12c',
                sessionId: 'session1',
                event: 'heartbeat',
                payload: { visibility: 'visible' }
            })
            await settle()

            client.emit('browser-session', {
                userId: 'user12c',
                sessionId: 'session1',
                event: 'disconnected',
                payload: {}
            })
            await settle()

            // The reloaded tab comes back before the window closes.
            client.emit('browser-session', {
                userId: 'user12c',
                sessionId: 'session1',
                event: 'heartbeat',
                payload: { visibility: 'visible' }
            })
            await settle()

            now += 60_000

            ;(await handler.getSessionsByUser('user12c')).should.have.length(1)
        })

        it('is a no-op for a tab that never registered presence', async function () {
            client.emit('browser-session', {
                userId: 'user13',
                sessionId: 'never-seen',
                event: 'disconnected',
                payload: {}
            })
            await settle()

            const sessions = await handler.getSessionsByUser('user13')
            sessions.should.have.length(0)
        })
    })

    describe('cache failures', function () {
        it('logs and swallows a rejected cache write', async function () {
            const cache = app.caches.getCache('browserSessions')
            const originalSet = cache.set
            const originalWarn = app.log.warn
            const warnings = []
            cache.set = async () => { throw new Error('cache unavailable') }
            app.log.warn = (msg) => { warnings.push(msg) }

            try {
                client.emit('browser-session', {
                    userId: 'user6',
                    sessionId: 'session1',
                    event: 'heartbeat',
                    payload: { visibility: 'visible' }
                })

                await new Promise(resolve => setImmediate(resolve))

                warnings.should.have.length(1)
                warnings[0].should.match(/cache unavailable/)
            } finally {
                cache.set = originalSet
                app.log.warn = originalWarn
            }
        })
    })

    describe('unknown event', function () {
        it('ignores unknown events', async function () {
            client.emit('browser-session', {
                userId: 'user7',
                sessionId: 'session1',
                event: 'invalid',
                payload: { some: 'data' }
            })

            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user7')
            sessions.should.have.length(0)
        })

        it('ignores the retired context event', async function () {
            client.emit('browser-session', {
                userId: 'user8',
                sessionId: 'session1',
                event: 'context',
                payload: { teamId: 'team1' }
            })

            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user8')
            sessions.should.have.length(0)
        })
    })

    describe('getSessionsByUser', function () {
        it('returns only sessions for the requested user', async function () {
            client.emit('browser-session', {
                userId: 'userA',
                sessionId: 'sessionA1',
                event: 'heartbeat',
                payload: { visibility: 'visible' }
            })
            client.emit('browser-session', {
                userId: 'userA',
                sessionId: 'sessionA2',
                event: 'heartbeat',
                payload: { visibility: 'hidden' }
            })
            client.emit('browser-session', {
                userId: 'userB',
                sessionId: 'sessionB1',
                event: 'heartbeat',
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
    describe('teamId propagation', function () {
        it('carries the teamId from the event onto the tab snapshot', async function () {
            client.emit('browser-session', {
                teamId: 'team-abc',
                userId: 'team-user',
                sessionId: 'team-session',
                event: 'heartbeat',
                payload: { visibility: 'visible' }
            })
            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('team-user')
            const session = sessions.find(s => s.sessionId === 'team-session')
            session.should.have.property('teamId', 'team-abc')
        })

        it('stores a null teamId rather than failing when the event has none', async function () {
            client.emit('browser-session', {
                userId: 'noteam-user',
                sessionId: 'noteam-session',
                event: 'heartbeat',
                payload: {}
            })
            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('noteam-user')
            const session = sessions.find(s => s.sessionId === 'noteam-session')
            should(session).be.an.Object()
            should(session.teamId).be.null()
        })
    })

    describe('notifyMcp', function () {
        let published
        let notifier

        beforeEach(function () {
            published = []
            const publishingClient = mockClient()
            publishingClient.publish = (topic, payload, options) => {
                published.push({ topic, payload, options })
            }
            notifier = BrowserSessionLifecycleHandler(app, publishingClient)
        })

        it('publishes to the tab own session topic', function () {
            notifier.notifyMcp('team-1', 'user-1', 'session-1', 'clients', { count: 2 })

            published.should.have.length(1)
            published[0].topic.should.equal('ff/v1/team-1/u/user-1/s/session-1/mcp/clients')
            JSON.parse(published[0].payload).should.deepEqual({ count: 2 })
        })

        it('publishes at qos 1 and does not retain', function () {
            notifier.notifyMcp('team-1', 'user-1', 'session-1', 'clients', {})

            published[0].options.should.have.property('qos', 1)
            published[0].options.should.have.property('retain', false)
        })

        it('defaults to an empty payload', function () {
            notifier.notifyMcp('team-1', 'user-1', 'session-1', 'clients')

            JSON.parse(published[0].payload).should.deepEqual({})
        })

        it('publishes nothing when any part of the address is missing', function () {
            notifier.notifyMcp(null, 'user-1', 'session-1', 'clients', {})
            notifier.notifyMcp('team-1', null, 'session-1', 'clients', {})
            notifier.notifyMcp('team-1', 'user-1', null, 'clients', {})
            notifier.notifyMcp('team-1', 'user-1', 'session-1', null, {})

            published.should.have.length(0)
        })
    })
})
