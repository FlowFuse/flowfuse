const should = require('should') // eslint-disable-line

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
        it('removes the session entry when the last will fires', async function () {
            client.emit('browser-session', {
                userId: 'user12',
                sessionId: 'session1',
                event: 'heartbeat',
                payload: { visibility: 'visible' }
            })
            await new Promise(resolve => setImmediate(resolve))
            ;(await handler.getSessionsByUser('user12')).should.have.length(1)

            client.emit('browser-session', {
                userId: 'user12',
                sessionId: 'session1',
                event: 'disconnected',
                payload: {}
            })
            await new Promise(resolve => setImmediate(resolve))

            const sessions = await handler.getSessionsByUser('user12')
            sessions.should.have.length(0)
        })

        it('is a no-op for a tab that never registered presence', async function () {
            client.emit('browser-session', {
                userId: 'user13',
                sessionId: 'never-seen',
                event: 'disconnected',
                payload: {}
            })
            await new Promise(resolve => setImmediate(resolve))

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
})
