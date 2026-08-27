import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const startTabPresence = vi.fn()
const stopTabPresence = vi.fn()
const startMcpInflight = vi.fn()
const stopMcpInflight = vi.fn()
const startMcpSession = vi.fn()
const stopMcpSession = vi.fn()
const emit = vi.fn()

vi.mock('@/publishers/tab-presence.publisher', () => ({
    startTabPresence: (...args) => startTabPresence(...args),
    stopTabPresence: (...args) => stopTabPresence(...args),
    announceTabPresence: vi.fn()
}))

vi.mock('@/subscribers/mcp-inflight.subscriber', () => ({
    startMcpInflight: (...args) => startMcpInflight(...args),
    stopMcpInflight: (...args) => stopMcpInflight(...args)
}))

vi.mock('@/subscribers/mcp-session.subscriber', () => ({
    startMcpSession: (...args) => startMcpSession(...args),
    stopMcpSession: (...args) => stopMcpSession(...args)
}))

vi.mock('@/services/alerts.js', () => ({
    default: { emit: (...args) => emit(...args) }
}))

// imported after mocks so vi.mock hoisting resolves correctly
const { useProductMcpStore } = await import('@/stores/product-mcp.js')

const TEAM = { id: 'team-1' }

describe('product-mcp store', () => {
    let store

    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        store = useProductMcpStore()
    })

    describe('status', () => {
        it('is off until the user exposes the tab', () => {
            expect(store.status).toBe('off')
        })

        it('is waiting once exposed with nothing targeting it', () => {
            store.enable(TEAM)
            expect(store.status).toBe('waiting')
        })

        it('is connected once something targets it', () => {
            store.enable(TEAM)
            store.setClients(['a'])
            expect(store.status).toBe('connected')
        })

        it('reports how many clients are targeting the tab', () => {
            store.enable(TEAM)
            store.setClients(['a', 'b', 'c'])
            expect(store.clientCount).toBe(3)
        })

        it('outranks connected with interrupted, since nothing is confirming the count', () => {
            store.enable(TEAM)
            store.setClients(['a'])
            store.markInterrupted()
            expect(store.status).toBe('interrupted')
        })

        it('stays off when interrupted but never exposed', () => {
            store.markInterrupted()
            expect(store.status).toBe('off')
        })
    })

    describe('enable', () => {
        it('brings up all three comms', () => {
            store.enable(TEAM)
            expect(startTabPresence).toHaveBeenCalledWith(TEAM)
            expect(startMcpInflight).toHaveBeenCalledWith(TEAM)
            expect(startMcpSession).toHaveBeenCalledWith(TEAM)
        })

        it('does nothing without a team', () => {
            store.enable(null)
            expect(startTabPresence).not.toHaveBeenCalled()
            expect(store.active).toBe(false)
        })

        it('starts from a clean slate, since a reload cannot know what held the tab', () => {
            store.clients = ['stale']
            store.interrupted = true
            store.synced = true

            store.enable(TEAM)

            expect(store.clients).toEqual([])
            expect(store.interrupted).toBe(false)
            expect(store.synced).toBe(false)
        })
    })

    describe('disable', () => {
        it('tears the comms down and tells the platform this tab opted out', async () => {
            store.enable(TEAM)
            const closed = await store.disable()

            expect(closed).toBe(true)
            expect(store.active).toBe(false)
            expect(stopMcpSession).toHaveBeenCalled()
            expect(stopMcpInflight).toHaveBeenCalled()
            expect(stopTabPresence).toHaveBeenCalledWith({ announceClose: true })
        })

        it('reports false on the second call, so one opt-out is announced once', async () => {
            store.enable(TEAM)
            const [first, second] = await Promise.all([store.disable(), store.disable()])
            expect([first, second].filter(Boolean)).toHaveLength(1)
        })
    })

    describe('teardown', () => {
        it('drops the comms silently, leaving the tab exposed for a remount', async () => {
            store.enable(TEAM)
            await store.teardown()

            expect(store.active).toBe(true)
            expect(stopTabPresence).toHaveBeenCalledWith({ announceClose: false })
        })
    })

    describe('mount refcount', () => {
        it('starts the comms only on the first toggle', () => {
            store.active = true
            store.retain(TEAM)
            store.retain(TEAM)

            expect(startTabPresence).toHaveBeenCalledTimes(1)
            expect(store.mounts).toBe(2)
        })

        it('keeps the comms up while a second toggle is still mounted', async () => {
            store.active = true
            store.retain(TEAM)
            store.retain(TEAM)
            vi.clearAllMocks()

            await store.release()

            expect(store.mounts).toBe(1)
            expect(stopTabPresence).not.toHaveBeenCalled()
        })

        it('tears down once the last toggle leaves', async () => {
            store.active = true
            store.retain(TEAM)
            store.retain(TEAM)
            await store.release()
            await store.release()

            expect(store.mounts).toBe(0)
            expect(stopTabPresence).toHaveBeenCalledWith({ announceClose: false })
        })

        it('does not start the comms for a tab that was never exposed', () => {
            store.retain(TEAM)
            expect(startTabPresence).not.toHaveBeenCalled()
        })

        it('never counts below zero', async () => {
            await store.release()
            expect(store.mounts).toBe(0)
        })
    })

    describe('setClients', () => {
        beforeEach(() => {
            store.enable(TEAM)
        })

        it('replaces rather than merges, so a lapsed pin drops off', () => {
            store.setClients(['a', 'b'])
            store.setClients(['b'])
            expect(store.clients).toEqual(['b'])
        })

        it('treats a non-array as nothing targeting the tab', () => {
            store.setClients(['a'])
            store.setClients(undefined)
            expect(store.clients).toEqual([])
        })

        it('says nothing on the first answer, which is catching up rather than an event', () => {
            store.setClients(['a'])
            expect(emit).not.toHaveBeenCalled()
        })

        it('announces an arrival', () => {
            store.setClients([])
            store.setClients(['a'])
            expect(emit).toHaveBeenCalledWith('An MCP client is now targeting this tab.', 'confirmation')
        })

        it('announces a departure', () => {
            store.setClients(['a'])
            store.setClients([])
            expect(emit).toHaveBeenCalledWith('An MCP client stopped targeting this tab.', 'info')
        })

        it('pluralises when several arrive at once', () => {
            store.setClients([])
            store.setClients(['a', 'b'])
            expect(emit).toHaveBeenCalledWith('2 MCP clients are now targeting this tab.', 'confirmation')
        })

        it('reports a swap as both, since the count alone would not move', () => {
            store.setClients(['a'])
            emit.mockClear()

            store.setClients(['b'])

            expect(emit).toHaveBeenCalledWith('An MCP client is now targeting this tab.', 'confirmation')
            expect(emit).toHaveBeenCalledWith('An MCP client stopped targeting this tab.', 'info')
        })

        it('says nothing when the set has not changed', () => {
            store.setClients(['a'])
            emit.mockClear()

            store.setClients(['a'])

            expect(emit).not.toHaveBeenCalled()
        })
    })

    describe('link health', () => {
        beforeEach(() => {
            store.enable(TEAM)
        })

        it('clears a fault when the link proves itself, even with no reconnect', () => {
            store.markInterrupted()
            store.markLinkHealthy()
            expect(store.interrupted).toBe(false)
        })

        it('keeps the last known clients rather than flashing waiting on recovery', () => {
            store.setClients(['a'])
            store.markInterrupted()

            store.markLinkHealthy()

            expect(store.clients).toEqual(['a'])
        })

        it('resyncs, so the restated count is not announced as arrivals', () => {
            store.setClients(['a'])
            store.markInterrupted()
            store.markLinkHealthy()
            emit.mockClear()

            store.setClients(['x', 'y'])

            expect(emit).not.toHaveBeenCalled()
        })

        it('is a no-op when the link was never faulted, so a healthy heartbeat costs nothing', () => {
            store.setClients(['a'])
            store.markLinkHealthy()
            expect(store.synced).toBe(true)
            expect(store.clients).toEqual(['a'])
        })
    })
})
