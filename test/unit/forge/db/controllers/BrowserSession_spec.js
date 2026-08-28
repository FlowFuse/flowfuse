const should = require('should')

const setup = require('../setup')

describe('BrowserSession controller', function () {
    let app
    let controller

    before(async function () {
        app = await setup()
        controller = app.db.controllers.BrowserSession
    })

    after(async function () {
        await app.close()
    })

    // keys in the active-pins cache that reference the given user
    async function activePinKeys (userId) {
        const cache = app.caches.getCache('browserSessions-active')
        const keys = await cache.keys()
        return keys.filter(key => key.includes(`:${userId}:`))
    }

    describe('pinning', function () {
        it('pins an MCP session to a browser session and resolves it back', async function () {
            await controller.recordPresence('u1', 'tab-1', { visibility: 'visible' })
            await controller.setActiveBrowserSession('u1', 'mcp-1', 'tab-1')

            const session = await controller.getActiveBrowserSession('u1', 'mcp-1')
            session.should.have.property('sessionId', 'tab-1')

            const mcpSessions = await controller.getActiveMcpSessions('u1', 'tab-1')
            mcpSessions.should.deepEqual(['mcp-1'])
        })

        it('returns null when the MCP session has no pin', async function () {
            const session = await controller.getActiveBrowserSession('u2', 'never-pinned')
            should(session).be.null()
        })

        it('returns null when the pinned tab has no presence', async function () {
            await controller.setActiveBrowserSession('u3', 'mcp-1', 'tab-gone')
            const session = await controller.getActiveBrowserSession('u3', 'mcp-1')
            should(session).be.null()
        })

        it('returns an empty array when a browser session has no pins', async function () {
            await controller.recordPresence('u4', 'tab-1', { visibility: 'visible' })
            const mcpSessions = await controller.getActiveMcpSessions('u4', 'tab-1')
            mcpSessions.should.deepEqual([])
        })

        it('lists every MCP session pinned to one tab', async function () {
            await controller.recordPresence('u5', 'tab-1', { visibility: 'visible' })
            await controller.setActiveBrowserSession('u5', 'mcp-a', 'tab-1')
            await controller.setActiveBrowserSession('u5', 'mcp-b', 'tab-1')

            const mcpSessions = await controller.getActiveMcpSessions('u5', 'tab-1')
            mcpSessions.sort().should.deepEqual(['mcp-a', 'mcp-b'])
        })

        it('scopes pins to the user', async function () {
            await controller.recordPresence('u6', 'tab-1', { visibility: 'visible' })
            await controller.recordPresence('u7', 'tab-1', { visibility: 'visible' })
            await controller.setActiveBrowserSession('u6', 'mcp-1', 'tab-1')

            ;(await controller.getActiveMcpSessions('u6', 'tab-1')).should.deepEqual(['mcp-1'])
            ;(await controller.getActiveMcpSessions('u7', 'tab-1')).should.deepEqual([])
            should(await controller.getActiveBrowserSession('u7', 'mcp-1')).be.null()
        })
    })

    describe('re-pinning', function () {
        it('moving a pin to another tab clears the old tab entry', async function () {
            await controller.recordPresence('u10', 'tab-a', { visibility: 'visible' })
            await controller.recordPresence('u10', 'tab-b', { visibility: 'visible' })
            await controller.setActiveBrowserSession('u10', 'mcp-1', 'tab-a')
            await controller.setActiveBrowserSession('u10', 'mcp-1', 'tab-b')

            ;(await controller.getActiveMcpSessions('u10', 'tab-a')).should.deepEqual([])
            ;(await controller.getActiveMcpSessions('u10', 'tab-b')).should.deepEqual(['mcp-1'])
            ;(await controller.getActiveBrowserSession('u10', 'mcp-1')).should.have.property('sessionId', 'tab-b')

            // nothing referencing tab-a is left behind in the cache
            const leftover = (await activePinKeys('u10')).filter(key => key.includes('tab-a'))
            leftover.should.deepEqual([])
        })
    })

    describe('removeSession', function () {
        it('clears the presence entry and every pin for the tab', async function () {
            await controller.recordPresence('u20', 'tab-1', { visibility: 'visible' })
            await controller.setActiveBrowserSession('u20', 'mcp-a', 'tab-1')
            await controller.setActiveBrowserSession('u20', 'mcp-b', 'tab-1')
            ;(await activePinKeys('u20')).should.have.length(4) // 2 pins x 2 directions

            await controller.removeSession('u20', 'tab-1')

            ;(await controller.getSessionsByUser('u20')).should.deepEqual([])
            ;(await controller.getActiveMcpSessions('u20', 'tab-1')).should.deepEqual([])
            should(await controller.getActiveBrowserSession('u20', 'mcp-a')).be.null()
            should(await controller.getActiveBrowserSession('u20', 'mcp-b')).be.null()
            ;(await activePinKeys('u20')).should.deepEqual([])
        })

        it('leaves a pin alone when it already moved to another tab', async function () {
            // capture the tab entry the implementation writes for tab-a, so the
            // simulated race below does not hardcode the key format
            await controller.recordPresence('u21', 'tab-b', { visibility: 'visible' })
            await controller.setActiveBrowserSession('u21', 'mcp-1', 'tab-a')
            const staleKey = (await activePinKeys('u21')).find(key => key.includes(':tab-a:'))
            should(staleKey).be.a.String()

            // simulate the race removeSession guards against: a stale tab entry
            // for a pin whose forward entry already points elsewhere
            await controller.setActiveBrowserSession('u21', 'mcp-1', 'tab-b')
            const activeCache = app.caches.getCache('browserSessions-active')
            await activeCache.set(staleKey, 'mcp-1')

            await controller.removeSession('u21', 'tab-a')

            // the stale entry is gone but the live pin to tab-b survives
            ;(await controller.getActiveMcpSessions('u21', 'tab-a')).should.deepEqual([])
            ;(await controller.getActiveMcpSessions('u21', 'tab-b')).should.deepEqual(['mcp-1'])
            ;(await controller.getActiveBrowserSession('u21', 'mcp-1')).should.have.property('sessionId', 'tab-b')
        })

        it('is a no-op for a tab with no presence or pins', async function () {
            await controller.removeSession('u22', 'never-seen')
            ;(await controller.getSessionsByUser('u22')).should.deepEqual([])
            ;(await activePinKeys('u22')).should.deepEqual([])
        })
    })

    describe('glob characters in ids', function () {
        it('treats glob characters in a browser session id literally', async function () {
            await controller.recordPresence('u30', 'tab-*', { visibility: 'visible' })
            await controller.recordPresence('u30', 'tab-abc', { visibility: 'visible' })
            await controller.setActiveBrowserSession('u30', 'mcp-star', 'tab-*')
            await controller.setActiveBrowserSession('u30', 'mcp-abc', 'tab-abc')

            // an unescaped 'tab-*' scan would also match tab-abc's pin
            ;(await controller.getActiveMcpSessions('u30', 'tab-*')).should.deepEqual(['mcp-star'])
            ;(await controller.getActiveMcpSessions('u30', 'tab-abc')).should.deepEqual(['mcp-abc'])
        })

        it('removeSession with a glob session id only clears that literal session', async function () {
            await controller.recordPresence('u31', 'tab-?', { visibility: 'visible' })
            await controller.recordPresence('u31', 'tab-x', { visibility: 'visible' })
            await controller.setActiveBrowserSession('u31', 'mcp-q', 'tab-?')
            await controller.setActiveBrowserSession('u31', 'mcp-x', 'tab-x')

            await controller.removeSession('u31', 'tab-?')

            ;(await controller.getActiveMcpSessions('u31', 'tab-?')).should.deepEqual([])
            ;(await controller.getActiveMcpSessions('u31', 'tab-x')).should.deepEqual(['mcp-x'])
            ;(await controller.getActiveBrowserSession('u31', 'mcp-x')).should.have.property('sessionId', 'tab-x')
        })

        it('handles glob characters in the user id', async function () {
            await controller.recordPresence('user[1]', 'tab-1', { visibility: 'visible' })
            await controller.recordPresence('user1', 'tab-1', { visibility: 'visible' })
            await controller.setActiveBrowserSession('user[1]', 'mcp-1', 'tab-1')

            ;(await controller.getActiveMcpSessions('user[1]', 'tab-1')).should.deepEqual(['mcp-1'])
            ;(await controller.getActiveMcpSessions('user1', 'tab-1')).should.deepEqual([])
        })
    })

    describe('heartbeat pin refresh', function () {
        it('recordPresence refreshes pins without altering them', async function () {
            await controller.recordPresence('u40', 'tab-1', { visibility: 'visible' })
            await controller.setActiveBrowserSession('u40', 'mcp-1', 'tab-1')
            const before = (await activePinKeys('u40')).sort()

            await controller.recordPresence('u40', 'tab-1', { visibility: 'hidden' })

            const after = (await activePinKeys('u40')).sort()
            after.should.deepEqual(before)
            ;(await controller.getActiveMcpSessions('u40', 'tab-1')).should.deepEqual(['mcp-1'])
        })
    })
    describe('client notifications', function () {
        let originalComms
        let sent

        beforeEach(function () {
            sent = []
            originalComms = app.comms
            app.comms = {
                browserSession: {
                    notifyMcp: (teamId, userId, sessionId, event, payload) => {
                        sent.push({ teamId, userId, sessionId, event, payload })
                    }
                }
            }
        })

        afterEach(function () {
            app.comms = originalComms
        })

        it('records the teamId a tab lives under, so it can be published back to', async function () {
            await controller.recordPresence('n1', 'tab-1', { visibility: 'visible' }, 'team-1')

            const entry = await app.caches.getCache('browserSessions').get('n1:tab-1')
            entry.should.have.property('teamId', 'team-1')
        })

        it('tells a tab its pinned clients on every heartbeat', async function () {
            await controller.recordPresence('n2', 'tab-1', {}, 'team-1')
            await controller.setActiveBrowserSession('n2', 'mcp-1', 'tab-1')
            sent = []

            await controller.recordPresence('n2', 'tab-1', {}, 'team-1')

            sent.should.have.length(1)
            sent[0].should.have.property('teamId', 'team-1')
            sent[0].should.have.property('sessionId', 'tab-1')
            sent[0].should.have.property('event', 'clients')
            sent[0].payload.should.have.property('count', 1)
        })

        it('reports an empty set rather than staying silent when nothing is pinned', async function () {
            await controller.recordPresence('n3', 'tab-1', {}, 'team-1')

            sent.should.have.length(1)
            sent[0].payload.should.have.property('count', 0)
            sent[0].payload.clients.should.deepEqual([])
        })

        it('sends opaque refs, never the MCP session ids themselves', async function () {
            await controller.recordPresence('n4', 'tab-1', {}, 'team-1')
            await controller.setActiveBrowserSession('n4', 'super-secret-mcp-session', 'tab-1')

            const payload = sent[sent.length - 1].payload
            payload.clients.should.have.length(1)
            payload.clients[0].should.not.equal('super-secret-mcp-session')
            payload.clients[0].should.match(/^[a-f0-9]{12}$/)
            JSON.stringify(payload).should.not.match(/super-secret-mcp-session/)
        })

        it('gives the same client the same ref every time, so arrivals can be told apart', async function () {
            await controller.recordPresence('n5', 'tab-1', {}, 'team-1')
            await controller.setActiveBrowserSession('n5', 'mcp-1', 'tab-1')
            const first = sent[sent.length - 1].payload.clients[0]

            await controller.recordPresence('n5', 'tab-1', {}, 'team-1')
            const second = sent[sent.length - 1].payload.clients[0]

            second.should.equal(first)
        })

        it('tells both tabs when a pin moves, so one count rises as the other falls', async function () {
            await controller.recordPresence('n6', 'tab-1', {}, 'team-1')
            await controller.recordPresence('n6', 'tab-2', {}, 'team-1')
            await controller.setActiveBrowserSession('n6', 'mcp-1', 'tab-1')
            sent = []

            await controller.setActiveBrowserSession('n6', 'mcp-1', 'tab-2')

            const byTab = Object.fromEntries(sent.map(m => [m.sessionId, m.payload.count]))
            byTab.should.have.property('tab-2', 1)
            byTab.should.have.property('tab-1', 0)
        })

        it('stays quiet for a tab whose snapshot predates teamId being recorded', async function () {
            await controller.recordPresence('n7', 'tab-1', {})
            sent = []

            await controller.setActiveBrowserSession('n7', 'mcp-1', 'tab-1')

            sent.should.have.length(0)
        })

        it('still pins when the platform has no comms configured', async function () {
            app.comms = undefined
            await controller.recordPresence('n8', 'tab-1', {}, 'team-1')

            await controller.setActiveBrowserSession('n8', 'mcp-1', 'tab-1')

            ;(await controller.getActiveMcpSessions('n8', 'tab-1')).should.deepEqual(['mcp-1'])
        })

        it('does not fail the pin when the notification throws', async function () {
            await controller.recordPresence('n9', 'tab-1', {}, 'team-1')
            app.comms.browserSession.notifyMcp = () => { throw new Error('broker down') }

            await controller.setActiveBrowserSession('n9', 'mcp-1', 'tab-1')

            // the pin is what matters - an agent told this failed would retry one that worked
            ;(await controller.getActiveMcpSessions('n9', 'tab-1')).should.deepEqual(['mcp-1'])
            ;(await controller.getActiveBrowserSession('n9', 'mcp-1')).should.have.property('sessionId', 'tab-1')
        })

        it('does not fail a heartbeat when the notification throws', async function () {
            app.comms.browserSession.notifyMcp = () => { throw new Error('broker down') }

            await controller.recordPresence('n10', 'tab-1', { visibility: 'visible' }, 'team-1')

            const entry = await app.caches.getCache('browserSessions').get('n10:tab-1')
            entry.should.have.property('sessionId', 'tab-1')
        })
    })
})
