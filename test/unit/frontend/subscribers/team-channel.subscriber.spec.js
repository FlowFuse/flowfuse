/* eslint-env browser */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const getTeamCommsCreds = vi.fn()
const refreshTeam = vi.fn().mockResolvedValue(undefined)
const onTeamChannelMembership = vi.fn().mockResolvedValue(undefined)
const useContextStore = vi.fn(() => ({ refreshTeam, onTeamChannelMembership }))
const useAccountAuthStore = vi.fn(() => ({ user: { id: 'user-hashid-1' }, getSessionId: () => 'session-test-id' }))
const setInstanceStatus = vi.fn()
const setDeviceStatus = vi.fn()
const setLive = vi.fn()
const clear = vi.fn()
const useLiveStatusStore = vi.fn(() => ({ setInstanceStatus, setDeviceStatus, setLive, clear }))

vi.mock('@/api/team.js', () => ({
    default: { getTeamCommsCreds: (...args) => getTeamCommsCreds(...args) }
}))
vi.mock('@/stores/context.js', () => ({ useContextStore }))
vi.mock('@/stores/account-auth.js', () => ({ useAccountAuthStore }))
vi.mock('@/stores/live-status', () => ({ useLiveStatusStore }))

function makeTransport () {
    return {
        connect: vi.fn(),
        subscribe: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined)
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
        const subscribers = { teamChannel: null }
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
        setInstanceStatus.mockClear()
        setDeviceStatus.mockClear()
        setLive.mockClear()
        clear.mockClear()
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
            expect(transport.connect).not.toHaveBeenCalled()
            expect(subscriber.isConnected()).toBe(false)
        })

        test('no-ops without a logged-in user', async () => {
            useAccountAuthStore.mockReturnValue({ user: null, getSessionId: () => 'session-test-id' })
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect({ id: 'team-1' })
            expect(transport.connect).not.toHaveBeenCalled()
            expect(subscriber.isConnected()).toBe(false)
        })

        test('connects the transport keyed by team id', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.connect.mockResolvedValue(undefined)
            await subscriber.connect({ id: 'team-1' })
            expect(transport.connect).toHaveBeenCalledTimes(1)
            const [key, opts] = transport.connect.mock.calls[0]
            expect(key).toBe('team:team-1')
            expect(typeof opts.getCredentials).toBe('function')
            expect(typeof opts.onMessage).toBe('function')
            expect(typeof opts.onConnect).toBe('function')
            expect(subscriber.isConnected()).toBe(true)
        })

        test('wires the full lifecycle handler surface', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.connect.mockResolvedValue(undefined)
            await subscriber.connect({ id: 'team-1' })
            const opts = transport.connect.mock.calls[0][1]
            expect(typeof opts.onMessage).toBe('function')
            expect(typeof opts.onConnect).toBe('function')
            expect(typeof opts.onClose).toBe('function')
            expect(typeof opts.onOffline).toBe('function')
            expect(typeof opts.onError).toBe('function')
            expect(typeof opts.onDisconnect).toBe('function')
        })

        test('quiet lifecycle handlers do not throw', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.connect.mockResolvedValue(undefined)
            await subscriber.connect({ id: 'team-1' })
            const opts = transport.connect.mock.calls[0][1]
            expect(() => opts.onClose()).not.toThrow()
            expect(() => opts.onOffline()).not.toThrow()
            expect(() => opts.onDisconnect()).not.toThrow()
            expect(() => opts.onError(new Error('boom'))).not.toThrow()
        })

        test('credential callback forwards team id + per-tab session id', async () => {
            getTeamCommsCreds.mockResolvedValue({ url: 'wss://broker', username: 'u', password: 'p' })
            const { subscriber, transport } = createSubscriber()
            transport.connect.mockResolvedValue(undefined)
            await subscriber.connect({ id: 'team-1' })
            const opts = transport.connect.mock.calls[0][1]
            await opts.getCredentials()
            expect(getTeamCommsCreds).toHaveBeenCalledWith('team-1', 'session-test-id')
        })

        test('skips reconnect when already connected to the same team', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.connect.mockResolvedValue(undefined)
            await subscriber.connect({ id: 'team-1' })
            await subscriber.connect({ id: 'team-1' })
            expect(transport.connect).toHaveBeenCalledTimes(1)
        })

        test('disconnects from the previous team when switching teams', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.connect.mockResolvedValue(undefined)
            await subscriber.connect({ id: 'team-1' })
            await subscriber.connect({ id: 'team-2' })
            expect(transport.disconnect).toHaveBeenCalledWith('team:team-1')
            expect(transport.connect).toHaveBeenCalledTimes(2)
            expect(transport.connect.mock.calls[1][0]).toBe('team:team-2')
        })

        test('degrades gracefully when connect rejects (e.g. no broker)', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.connect.mockRejectedValue(new Error('comms_unavailable'))
            await expect(subscriber.connect({ id: 'team-1' })).resolves.toBeUndefined()
            expect(subscriber.isConnected()).toBe(false)
        })
    })

    describe('subscribe on connect', () => {
        test('subscribes to t/updated, membership and the state wildcards with qos 1', async () => {
            const { subscriber, transport } = createSubscriber()
            let onConnect
            transport.connect.mockImplementation(async (_key, opts) => {
                onConnect = opts.onConnect
            })
            await subscriber.connect({ id: 'team-1' })
            await onConnect()
            expect(transport.subscribe).toHaveBeenCalledWith(
                'team:team-1',
                [
                    'ff/v1/team-1/t/updated',
                    'ff/v1/team-1/u/user-hashid-1/membership',
                    'ff/v1/team-1/p/+/state',
                    'ff/v1/team-1/d/+/state'
                ],
                { qos: 1 }
            )
        })

        test('marks the status channel live once subscribed', async () => {
            const { subscriber, transport } = createSubscriber()
            let onConnect
            transport.connect.mockImplementation(async (_key, opts) => {
                onConnect = opts.onConnect
            })
            await subscriber.connect({ id: 'team-1' })
            await onConnect()
            expect(setLive).toHaveBeenCalledWith(true)
        })

        test('does not mark live when the subscribe fails', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.subscribe.mockRejectedValue(new Error('subscribe failed'))
            let onConnect
            transport.connect.mockImplementation(async (_key, opts) => {
                onConnect = opts.onConnect
            })
            await subscriber.connect({ id: 'team-1' })
            await onConnect()
            expect(setLive).not.toHaveBeenCalled()
        })

        test('swallows subscribe errors (transport reconnect will retry)', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.subscribe.mockRejectedValue(new Error('subscribe failed'))
            let onConnect
            transport.connect.mockImplementation(async (_key, opts) => {
                onConnect = opts.onConnect
            })
            await subscriber.connect({ id: 'team-1' })
            await expect(onConnect()).resolves.toBeUndefined()
        })
    })

    describe('message routing (dispatches to the store)', () => {
        async function connectAndCaptureOnMessage () {
            const { subscriber, transport, router } = createSubscriber()
            let onMessage
            transport.connect.mockImplementation(async (_key, opts) => {
                onMessage = opts.onMessage
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

        test('instance state routes id + state into setInstanceStatus', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/p/inst-1/state', Buffer.from(JSON.stringify({ id: 'inst-1', meta: { state: 'running' } })))
            expect(setInstanceStatus).toHaveBeenCalledWith('inst-1', 'running', undefined)
            expect(setDeviceStatus).not.toHaveBeenCalled()
        })

        test('instance state forwards versions when present', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            const versions = { 'node-red': '5.0.0', launcher: '2.31.3' }
            onMessage('ff/v1/team-1/p/inst-1/state', Buffer.from(JSON.stringify({ id: 'inst-1', meta: { state: 'running', versions } })))
            expect(setInstanceStatus).toHaveBeenCalledWith('inst-1', 'running', versions)
        })

        test('device state routes id + state into setDeviceStatus', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/d/dev-1/state', Buffer.from(JSON.stringify({ id: 'dev-1', meta: { state: 'stopped' } })))
            expect(setDeviceStatus).toHaveBeenCalledWith('dev-1', 'stopped')
            expect(setInstanceStatus).not.toHaveBeenCalled()
        })

        test('ignores a state message missing id or state', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/p/inst-1/state', Buffer.from(JSON.stringify({ id: 'inst-1' })))
            onMessage('ff/v1/team-1/d/dev-1/state', Buffer.from(JSON.stringify({ meta: { state: 'running' } })))
            expect(setInstanceStatus).not.toHaveBeenCalled()
            expect(setDeviceStatus).not.toHaveBeenCalled()
        })
    })

    describe('disconnect / destroy', () => {
        test('disconnect tears down the client and clears connected state', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.connect.mockResolvedValue(undefined)
            await subscriber.connect({ id: 'team-1' })
            await subscriber.disconnect()
            expect(transport.disconnect).toHaveBeenCalledWith('team:team-1')
            expect(subscriber.isConnected()).toBe(false)
        })

        test('disconnect clears the live-status store (no prior-team leak)', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.connect.mockResolvedValue(undefined)
            await subscriber.connect({ id: 'team-1' })
            await subscriber.disconnect()
            expect(clear).toHaveBeenCalledTimes(1)
        })

        test('disconnect is a no-op when not connected', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.disconnect()
            expect(transport.disconnect).not.toHaveBeenCalled()
            expect(clear).not.toHaveBeenCalled()
        })

        test('destroy disconnects the active client', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.connect.mockResolvedValue(undefined)
            await subscriber.connect({ id: 'team-1' })
            await subscriber.destroy()
            expect(transport.disconnect).toHaveBeenCalledWith('team:team-1')
        })
    })
})
