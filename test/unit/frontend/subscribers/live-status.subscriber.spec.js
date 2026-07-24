/* eslint-env browser */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const getTeamCommsCreds = vi.fn()
const useAccountAuthStore = vi.fn(() => ({ user: { id: 'user-hashid-1' }, getSessionId: () => 'session-test-id' }))
const setInstanceStatus = vi.fn()
const setDeviceStatus = vi.fn()
const setLive = vi.fn()
const clear = vi.fn()
const useLiveStatusStore = vi.fn(() => ({ setInstanceStatus, setDeviceStatus, setLive, clear }))

vi.mock('@/api/team.js', () => ({
    default: { getTeamCommsCreds: (...args) => getTeamCommsCreds(...args) }
}))
vi.mock('@/stores/account-auth.js', () => ({ useAccountAuthStore }))
vi.mock('@/stores/live-status', () => ({ useLiveStatusStore }))

function makeTransport () {
    return {
        attach: vi.fn().mockImplementation(async (key) => ({ key, id: 1 })),
        subscribe: vi.fn().mockResolvedValue(undefined),
        detach: vi.fn().mockResolvedValue(undefined)
    }
}

describe('LiveStatusSubscriber', async () => {
    const mod = await import('../../../../frontend/src/subscribers/live-status.subscriber.ts')
    const { createLiveStatusSubscriber, destroyLiveStatusSubscriber } = mod

    function createSubscriber ({ transport = makeTransport() } = {}) {
        const subscribers = { teamChannel: null, liveStatus: null }
        const subscriber = createLiveStatusSubscriber({ app: {}, router: {}, transport, subscribers })
        subscribers.liveStatus = subscriber
        return { subscriber, transport }
    }

    beforeEach(async () => {
        getTeamCommsCreds.mockReset()
        useAccountAuthStore.mockClear().mockReturnValue({ user: { id: 'user-hashid-1' }, getSessionId: () => 'session-test-id' })
        setInstanceStatus.mockClear()
        setDeviceStatus.mockClear()
        setLive.mockClear()
        clear.mockClear()
        await destroyLiveStatusSubscriber()
    })

    afterEach(async () => {
        await destroyLiveStatusSubscriber()
    })

    describe('connect', () => {
        test('attaches the transport keyed by team id', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect({ id: 'team-1' })
            expect(transport.attach).toHaveBeenCalledTimes(1)
            expect(transport.attach.mock.calls[0][0]).toBe('team:team-1')
            expect(subscriber.isConnected()).toBe(true)
        })

        test('no-ops without a team or logged-in user', async () => {
            useAccountAuthStore.mockReturnValue({ user: null, getSessionId: () => 'session-test-id' })
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect(null)
            await subscriber.connect({ id: 'team-1' })
            expect(transport.attach).not.toHaveBeenCalled()
        })

        test('degrades gracefully when attach rejects', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.attach.mockRejectedValue(new Error('comms_unavailable'))
            await expect(subscriber.connect({ id: 'team-1' })).resolves.toBeUndefined()
            expect(subscriber.isConnected()).toBe(false)
            expect(setLive).not.toHaveBeenCalled()
        })
    })

    describe('subscribe on connect', () => {
        async function connectAndCaptureOnConnect () {
            const { subscriber, transport } = createSubscriber()
            let onConnect
            transport.attach.mockImplementation(async (key, opts) => {
                onConnect = opts.onConnect
                return { key, id: 1 }
            })
            await subscriber.connect({ id: 'team-1' })
            return { subscriber, transport, onConnect }
        }

        test('subscribes to the p/+/state and d/+/state wildcards with qos 1', async () => {
            const { transport, onConnect } = await connectAndCaptureOnConnect()
            await onConnect()
            expect(transport.subscribe).toHaveBeenCalledWith(
                'team:team-1',
                [
                    'ff/v1/team-1/p/+/state',
                    'ff/v1/team-1/d/+/state'
                ],
                { qos: 1 }
            )
        })

        test('marks the status channel live once subscribed', async () => {
            const { onConnect } = await connectAndCaptureOnConnect()
            await onConnect()
            expect(setLive).toHaveBeenCalledWith(true)
        })

        test('does not mark live when the subscribe fails', async () => {
            const { subscriber, transport } = createSubscriber()
            transport.subscribe.mockRejectedValue(new Error('subscribe failed'))
            let onConnect
            transport.attach.mockImplementation(async (key, opts) => {
                onConnect = opts.onConnect
                return { key, id: 1 }
            })
            await subscriber.connect({ id: 'team-1' })
            await onConnect()
            expect(setLive).not.toHaveBeenCalled()
        })
    })

    describe('message routing (dispatches to the store)', () => {
        async function connectAndCaptureOnMessage () {
            const { subscriber, transport } = createSubscriber()
            let onMessage
            transport.attach.mockImplementation(async (key, opts) => {
                onMessage = opts.onMessage
                return { key, id: 1 }
            })
            await subscriber.connect({ id: 'team-1' })
            return { subscriber, onMessage }
        }

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
            expect(setDeviceStatus).toHaveBeenCalledWith('dev-1', 'stopped', undefined)
            expect(setInstanceStatus).not.toHaveBeenCalled()
        })

        test('device state forwards onlineStatus when present', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/d/dev-1/state', Buffer.from(JSON.stringify({ id: 'dev-1', meta: { state: 'running', onlineStatus: 'online' } })))
            expect(setDeviceStatus).toHaveBeenCalledWith('dev-1', 'running', 'online')
        })

        test('ignores a state message missing id or state', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/p/inst-1/state', Buffer.from(JSON.stringify({ id: 'inst-1' })))
            onMessage('ff/v1/team-1/d/dev-1/state', Buffer.from(JSON.stringify({ meta: { state: 'running' } })))
            expect(setInstanceStatus).not.toHaveBeenCalled()
            expect(setDeviceStatus).not.toHaveBeenCalled()
        })

        test('ignores membership/team-updated topics (owned by the team-channel subscriber)', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/t/updated', Buffer.from('{}'))
            onMessage('ff/v1/team-1/u/user-hashid-1/membership', Buffer.from(JSON.stringify({ reason: 'removed' })))
            expect(setInstanceStatus).not.toHaveBeenCalled()
            expect(setDeviceStatus).not.toHaveBeenCalled()
        })

        test('does not throw on malformed JSON payloads', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            expect(() => onMessage('ff/v1/team-1/p/inst-1/state', Buffer.from('not json'))).not.toThrow()
            expect(setInstanceStatus).not.toHaveBeenCalled()
        })
    })

    describe('disconnect / destroy', () => {
        test('disconnect detaches and clears the live-status store', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect({ id: 'team-1' })
            await subscriber.disconnect()
            expect(transport.detach).toHaveBeenCalledWith(expect.objectContaining({ key: 'team:team-1' }))
            expect(clear).toHaveBeenCalledTimes(1)
            expect(subscriber.isConnected()).toBe(false)
        })

        test('disconnect is a no-op when not connected', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.disconnect()
            expect(transport.detach).not.toHaveBeenCalled()
            expect(clear).not.toHaveBeenCalled()
        })

        test('destroy disconnects the active attachment', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect({ id: 'team-1' })
            await subscriber.destroy()
            expect(transport.detach).toHaveBeenCalledWith(expect.objectContaining({ key: 'team:team-1' }))
        })
    })
})
