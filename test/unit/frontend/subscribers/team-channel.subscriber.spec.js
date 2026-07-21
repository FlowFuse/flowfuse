/* eslint-env browser */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const getTeamCommsCreds = vi.fn()
const refreshTeam = vi.fn().mockResolvedValue(undefined)
const onTeamChannelMembership = vi.fn().mockResolvedValue(undefined)
const useContextStore = vi.fn(() => ({ refreshTeam, onTeamChannelMembership }))
const useAccountAuthStore = vi.fn(() => ({ user: { id: 'user-hashid-1' }, getSessionId: () => 'session-test-id' }))

vi.mock('@/api/team.js', () => ({
    default: { getTeamCommsCreds: (...args) => getTeamCommsCreds(...args) }
}))
vi.mock('@/stores/context.js', () => ({ useContextStore }))
vi.mock('@/stores/account-auth.js', () => ({ useAccountAuthStore }))

function makeTransport () {
    return {
        attach: vi.fn().mockImplementation(async (key) => ({ key, id: 1 })),
        subscribe: vi.fn().mockResolvedValue(undefined),
        detach: vi.fn().mockResolvedValue(undefined)
    }
}

function makeRouter (path = '/team/dev/instances') {
    return {
        push: vi.fn(),
        currentRoute: { value: { path } }
    }
}

describe('TeamChannelSubscriber', async () => {
    const mod = await import('../../../../frontend/src/subscribers/team-channel.subscriber.ts')
    const { createTeamChannelSubscriber, destroyTeamChannelSubscriber } = mod

    function createSubscriber ({ transport = makeTransport(), router = makeRouter() } = {}) {
        const subscribers = { teamChannel: null, liveStatus: null }
        const subscriber = createTeamChannelSubscriber({ app: {}, router, transport, subscribers })
        subscribers.teamChannel = subscriber
        return { subscriber, transport, router }
    }

    beforeEach(async () => {
        getTeamCommsCreds.mockReset()
        refreshTeam.mockClear()
        onTeamChannelMembership.mockClear()
        useContextStore.mockClear()
        useAccountAuthStore.mockClear().mockReturnValue({ user: { id: 'user-hashid-1' }, getSessionId: () => 'session-test-id' })
        await destroyTeamChannelSubscriber()
    })

    afterEach(async () => {
        await destroyTeamChannelSubscriber()
    })

    describe('connect', () => {
        test('no-ops without a team', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect(null)
            await subscriber.connect({})
            await subscriber.connect({ id: '' })
            await subscriber.connect({ id: 123 })
            expect(transport.attach).not.toHaveBeenCalled()
            expect(subscriber.isConnected()).toBe(false)
        })

        test('no-ops without a logged-in user', async () => {
            useAccountAuthStore.mockReturnValue({ user: null, getSessionId: () => 'session-test-id' })
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect({ id: 'team-1' })
            expect(transport.attach).not.toHaveBeenCalled()
            expect(subscriber.isConnected()).toBe(false)
        })

        test('attaches the transport keyed by team id', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect({ id: 'team-1' })
            expect(transport.attach).toHaveBeenCalledTimes(1)
            const [key, opts] = transport.attach.mock.calls[0]
            expect(key).toBe('team:team-1')
            expect(typeof opts.getCredentials).toBe('function')
            expect(typeof opts.onMessage).toBe('function')
            expect(typeof opts.onConnect).toBe('function')
            expect(subscriber.isConnected()).toBe(true)
        })

        test('wires the full lifecycle handler surface', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect({ id: 'team-1' })
            const opts = transport.attach.mock.calls[0][1]
            expect(typeof opts.onMessage).toBe('function')
            expect(typeof opts.onConnect).toBe('function')
            expect(typeof opts.onClose).toBe('function')
            expect(typeof opts.onOffline).toBe('function')
            expect(typeof opts.onError).toBe('function')
            expect(typeof opts.onDisconnect).toBe('function')
        })

        test('quiet lifecycle handlers do not throw', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect({ id: 'team-1' })
            const opts = transport.attach.mock.calls[0][1]
            expect(() => opts.onClose()).not.toThrow()
            expect(() => opts.onOffline()).not.toThrow()
            expect(() => opts.onDisconnect()).not.toThrow()
            expect(() => opts.onError(new Error('boom'))).not.toThrow()
        })

        test('credential callback forwards team id + per-tab session id', async () => {
            getTeamCommsCreds.mockResolvedValue({ url: 'wss://broker', username: 'u', password: 'p' })
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect({ id: 'team-1' })
            const opts = transport.attach.mock.calls[0][1]
            await opts.getCredentials()
            expect(getTeamCommsCreds).toHaveBeenCalledWith('team-1', 'session-test-id')
        })

        test('skips reconnect when already connected to the same team', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect({ id: 'team-1' })
            await subscriber.connect({ id: 'team-1' })
            expect(transport.attach).toHaveBeenCalledTimes(1)
        })

        test('detaches from the previous team when switching teams', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect({ id: 'team-1' })
            await subscriber.connect({ id: 'team-2' })
            expect(transport.detach).toHaveBeenCalledWith(expect.objectContaining({ key: 'team:team-1' }))
            expect(transport.attach).toHaveBeenCalledTimes(2)
            expect(transport.attach.mock.calls[1][0]).toBe('team:team-2')
        })

        test('degrades gracefully when attach rejects (e.g. no broker)', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.attach.mockRejectedValue(new Error('comms_unavailable'))
            await expect(subscriber.connect({ id: 'team-1' })).resolves.toBeUndefined()
            expect(subscriber.isConnected()).toBe(false)
        })

        test('serializes overlapping connects to the same team (no orphaned attachment)', async () => {
            const { subscriber, transport } = createSubscriber()
            let resolveAttach
            const gate = new Promise((resolve) => { resolveAttach = resolve })
            transport.attach.mockImplementation((key) => gate.then(() => ({ key, id: 1 })))

            const first = subscriber.connect({ id: 'team-1' })
            const second = subscriber.connect({ id: 'team-1' })
            resolveAttach()
            await Promise.all([first, second])

            expect(transport.attach).toHaveBeenCalledTimes(1)
            expect(subscriber.isConnected()).toBe(true)
        })

        test('serialized switch detaches the old team exactly once before attaching the new one', async () => {
            const { subscriber, transport } = createSubscriber()
            const first = subscriber.connect({ id: 'team-1' })
            const second = subscriber.connect({ id: 'team-2' })
            await Promise.all([first, second])

            expect(transport.detach).toHaveBeenCalledTimes(1)
            expect(transport.detach).toHaveBeenCalledWith(expect.objectContaining({ key: 'team:team-1' }))
            expect(transport.attach.mock.calls.map(c => c[0])).toEqual(['team:team-1', 'team:team-2'])
        })
    })

    describe('subscribe on connect', () => {
        test('subscribes to t/updated and membership with qos 1', async () => {
            const { subscriber, transport } = createSubscriber()
            let onConnect
            transport.attach.mockImplementation(async (key, opts) => {
                onConnect = opts.onConnect
                return { key, id: 1 }
            })
            await subscriber.connect({ id: 'team-1' })
            await onConnect()
            expect(transport.subscribe).toHaveBeenCalledWith(
                'team:team-1',
                [
                    'ff/v1/team-1/t/updated',
                    'ff/v1/team-1/u/user-hashid-1/membership'
                ],
                { qos: 1 }
            )
        })

        test('swallows subscribe errors (transport reconnect will retry)', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.subscribe.mockRejectedValue(new Error('subscribe failed'))
            let onConnect
            transport.attach.mockImplementation(async (key, opts) => {
                onConnect = opts.onConnect
                return { key, id: 1 }
            })
            await subscriber.connect({ id: 'team-1' })
            await expect(onConnect()).resolves.toBeUndefined()
        })
    })

    describe('message routing (dispatches to the store)', () => {
        async function connectAndCaptureOnMessage () {
            const { subscriber, transport, router } = createSubscriber()
            let onMessage
            transport.attach.mockImplementation(async (key, opts) => {
                onMessage = opts.onMessage
                return { key, id: 1 }
            })
            await subscriber.connect({ id: 'team-1' })
            return { subscriber, transport, router, onMessage }
        }

        test('t/updated dispatches refreshTeam', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/t/updated', Buffer.from(JSON.stringify({})))
            expect(refreshTeam).toHaveBeenCalledTimes(1)
            expect(onTeamChannelMembership).not.toHaveBeenCalled()
        })

        test('membership dispatches onTeamChannelMembership with the payload', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/u/user-hashid-1/membership', Buffer.from(JSON.stringify({ reason: 'role-changed' })))
            expect(onTeamChannelMembership).toHaveBeenCalledWith({ reason: 'role-changed' })
            expect(refreshTeam).not.toHaveBeenCalled()
        })

        test('membership "removed" is forwarded verbatim (store owns interpretation)', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/u/user-hashid-1/membership', Buffer.from(JSON.stringify({ reason: 'removed' })))
            expect(onTeamChannelMembership).toHaveBeenCalledWith({ reason: 'removed' })
        })

        test('does not throw on malformed JSON payloads', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            expect(() => onMessage('ff/v1/team-1/t/updated', Buffer.from('not json'))).not.toThrow()
            expect(refreshTeam).toHaveBeenCalledTimes(1)
        })

        test('ignores topics outside the team-channel scheme', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/some/other/topic', Buffer.from('{}'))
            expect(refreshTeam).not.toHaveBeenCalled()
            expect(onTeamChannelMembership).not.toHaveBeenCalled()
        })

        test('ignores instance/device state topics (owned by the live-status subscriber)', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/p/inst-1/state', Buffer.from(JSON.stringify({ id: 'inst-1', meta: { state: 'running' } })))
            onMessage('ff/v1/team-1/d/dev-1/state', Buffer.from(JSON.stringify({ id: 'dev-1', meta: { state: 'stopped' } })))
            expect(refreshTeam).not.toHaveBeenCalled()
            expect(onTeamChannelMembership).not.toHaveBeenCalled()
        })
    })

    describe('disconnect / destroy', () => {
        test('disconnect tears down the attachment and clears connected state', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect({ id: 'team-1' })
            await subscriber.disconnect()
            expect(transport.detach).toHaveBeenCalledWith(expect.objectContaining({ key: 'team:team-1' }))
            expect(subscriber.isConnected()).toBe(false)
        })

        test('disconnect is a no-op when not connected', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.disconnect()
            expect(transport.detach).not.toHaveBeenCalled()
        })

        test('destroy disconnects the active attachment', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect({ id: 'team-1' })
            await subscriber.destroy()
            expect(transport.detach).toHaveBeenCalledWith(expect.objectContaining({ key: 'team:team-1' }))
        })
    })
})
