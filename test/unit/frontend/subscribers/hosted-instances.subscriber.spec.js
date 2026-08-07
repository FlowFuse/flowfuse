/* eslint-env browser */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const getTeamCommsCreds = vi.fn()
const useAccountAuthStore = vi.fn(() => ({ user: { id: 'user-hashid-1' }, getSessionId: () => 'session-test-id' }))
const applyRealtimeEvent = vi.fn()
const useDataFarmHostedInstancesStore = vi.fn(() => ({ applyRealtimeEvent }))

vi.mock('@/api/team.js', () => ({
    default: { getTeamCommsCreds: (...args) => getTeamCommsCreds(...args) }
}))
vi.mock('@/stores/account-auth.js', () => ({ useAccountAuthStore }))
vi.mock('@/stores/data-farm-hosted-instances', () => ({ useDataFarmHostedInstancesStore }))

function makeTransport () {
    return {
        attach: vi.fn().mockImplementation(async (key) => ({ key, id: 1 })),
        subscribe: vi.fn().mockResolvedValue(undefined),
        detach: vi.fn().mockResolvedValue(undefined)
    }
}

describe('HostedInstancesSubscriber', async () => {
    const mod = await import('../../../../frontend/src/subscribers/hosted-instances.subscriber.ts')
    const { createHostedInstancesSubscriber, destroyHostedInstancesSubscriber } = mod

    function createSubscriber ({ transport = makeTransport() } = {}) {
        const subscribers = { teamChannel: null, liveStatus: null, applications: null, hostedInstances: null }
        const subscriber = createHostedInstancesSubscriber({ app: {}, router: {}, transport, subscribers })
        subscribers.hostedInstances = subscriber
        return { subscriber, transport }
    }

    beforeEach(async () => {
        getTeamCommsCreds.mockReset()
        useAccountAuthStore.mockClear().mockReturnValue({ user: { id: 'user-hashid-1' }, getSessionId: () => 'session-test-id' })
        applyRealtimeEvent.mockClear()
        await destroyHostedInstancesSubscriber()
    })

    afterEach(async () => {
        await destroyHostedInstancesSubscriber()
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

        test('subscribes to the p/+/created|updated|deleted wildcards with qos 1', async () => {
            const { transport, onConnect } = await connectAndCaptureOnConnect()
            await onConnect()
            expect(transport.subscribe).toHaveBeenCalledWith(
                'team:team-1',
                [
                    'ff/v1/team-1/p/+/created',
                    'ff/v1/team-1/p/+/updated',
                    'ff/v1/team-1/p/+/deleted'
                ],
                { qos: 1 }
            )
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

        test('created topic forwards the event to applyRealtimeEvent', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            const event = { id: 'inst-1', action: 'created', data: { id: 'inst-1', name: 'One' } }
            onMessage('ff/v1/team-1/p/inst-1/created', Buffer.from(JSON.stringify(event)))
            expect(applyRealtimeEvent).toHaveBeenCalledWith(event)
        })

        test('updated topic forwards the event to applyRealtimeEvent', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            const event = { id: 'inst-1', action: 'updated', data: { id: 'inst-1', name: 'Renamed' } }
            onMessage('ff/v1/team-1/p/inst-1/updated', Buffer.from(JSON.stringify(event)))
            expect(applyRealtimeEvent).toHaveBeenCalledWith(event)
        })

        test('deleted topic forwards the event to applyRealtimeEvent', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            const event = { id: 'inst-1', action: 'deleted' }
            onMessage('ff/v1/team-1/p/inst-1/deleted', Buffer.from(JSON.stringify(event)))
            expect(applyRealtimeEvent).toHaveBeenCalledWith(event)
        })

        test('ignores an event missing id or action', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/p/inst-1/created', Buffer.from(JSON.stringify({ action: 'created' })))
            onMessage('ff/v1/team-1/p/inst-1/created', Buffer.from(JSON.stringify({ id: 'inst-1' })))
            expect(applyRealtimeEvent).not.toHaveBeenCalled()
        })

        test('ignores unrelated topics (p/+/state owned by live-status, and team-channel)', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/p/inst-1/state', Buffer.from(JSON.stringify({ id: 'inst-1', meta: { state: 'running' } })))
            onMessage('ff/v1/team-1/t/updated', Buffer.from('{}'))
            expect(applyRealtimeEvent).not.toHaveBeenCalled()
        })

        test('does not throw on malformed JSON payloads', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            expect(() => onMessage('ff/v1/team-1/p/inst-1/created', Buffer.from('not json'))).not.toThrow()
            expect(applyRealtimeEvent).not.toHaveBeenCalled()
        })
    })

    describe('disconnect / destroy', () => {
        test('disconnect detaches the transport', async () => {
            const { subscriber, transport } = createSubscriber()
            await subscriber.connect({ id: 'team-1' })
            await subscriber.disconnect()
            expect(transport.detach).toHaveBeenCalledWith(expect.objectContaining({ key: 'team:team-1' }))
            expect(subscriber.isConnected()).toBe(false)
        })
    })
})
