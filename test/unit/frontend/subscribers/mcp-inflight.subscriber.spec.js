import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const getTeamCommsCreds = vi.fn()
const handleInFlightRequest = vi.fn()

const authStore = { user: { id: 'user-hashid-1' }, getSessionId: () => 'browser-session-1' }
const expertStore = { sessionId: 'expert-chat-session', handleInFlightRequest }

const useAccountAuthStore = vi.fn(() => authStore)
const useProductExpertStore = vi.fn(() => expertStore)
const useContextStore = vi.fn(() => ({ team: { id: 'team-1' } }))

vi.mock('@/api/team.js', () => ({
    default: { getTeamCommsCreds: (...args) => getTeamCommsCreds(...args) }
}))
vi.mock('@/stores/account-auth.js', () => ({ useAccountAuthStore }))
vi.mock('@/stores/product-expert.js', () => ({ useProductExpertStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore }))
// the topic helper reaches for the stores through the barrel
vi.mock('@/stores', () => ({ useAccountAuthStore, useProductExpertStore, useContextStore }))
vi.mock('@/services/app.orchestrator', () => ({ default: () => ({ $app: {}, $router: {}, $services: { mqtt: {} } }) }))

function makeTransport () {
    return {
        attach: vi.fn().mockImplementation(async (key) => ({ key, id: 1 })),
        subscribe: vi.fn().mockResolvedValue(undefined),
        detach: vi.fn().mockResolvedValue(undefined)
    }
}

const REQUEST_TOPIC = 'ff/v1/expert/user-hashid-1/browser-session-1/p/instance-1/mcp/inflight/automation:get-nodes/request'

describe('McpInflightSubscriber', async () => {
    const mod = await import('../../../../frontend/src/subscribers/mcp-inflight.subscriber.ts')
    const { createMcpInflightSubscriber, destroyMcpInflightSubscriber } = mod

    function createSubscriber ({ transport = makeTransport() } = {}) {
        const subscriber = createMcpInflightSubscriber({ app: {}, router: { push: vi.fn() }, transport })
        return { subscriber, transport }
    }

    async function connected () {
        const { subscriber, transport } = createSubscriber()
        await subscriber.connect({ id: 'team-1' })
        // the transport invokes onConnect once the client is up
        await transport.attach.mock.calls[0][1].onConnect()
        return { subscriber, transport }
    }

    beforeEach(async () => {
        getTeamCommsCreds.mockReset()
        handleInFlightRequest.mockReset()
        await destroyMcpInflightSubscriber()
    })

    afterEach(async () => {
        await destroyMcpInflightSubscriber()
    })

    describe('subscription', () => {
        test('rides the team connection', async () => {
            const { transport } = await connected()
            expect(transport.attach.mock.calls[0][0]).toBe('team:team-1')
            expect(transport.subscribe.mock.calls[0][0]).toBe('team:team-1')
        })

        test('subscribes to its own browser session, not the expert chat session', async () => {
            const { transport } = await connected()
            const [, topics] = transport.subscribe.mock.calls[0]
            expect(topics).toEqual([
                'ff/v1/expert/user-hashid-1/browser-session-1/+/+/mcp/inflight/+/request'
            ])
            expect(topics[0]).not.toContain('expert-chat-session')
        })

        test('subscribes at qos 2', async () => {
            const { transport } = await connected()
            expect(transport.subscribe.mock.calls[0][2]).toEqual({ qos: 2 })
        })

        test('detaches on destroy', async () => {
            const { transport } = await connected()
            await destroyMcpInflightSubscriber()
            expect(transport.detach).toHaveBeenCalledWith(expect.objectContaining({ key: 'team:team-1' }))
        })
    })

    describe('incoming requests', () => {
        function deliver (transport, topic, payload, packet) {
            const { onMessage } = transport.attach.mock.calls[0][1]
            return onMessage(topic, JSON.stringify(payload), packet)
        }

        test('forwards a request to the expert store handler', async () => {
            const { transport } = await connected()
            deliver(transport, REQUEST_TOPIC, { params: { nodeId: 'n1' } }, {
                properties: { correlationData: new TextEncoder().encode('txn-1') }
            })

            expect(handleInFlightRequest).toHaveBeenCalledTimes(1)
            expect(handleInFlightRequest.mock.calls[0][0]).toEqual(expect.objectContaining({
                topic: REQUEST_TOPIC,
                payload: { params: { nodeId: 'n1' } },
                transactionId: 'txn-1'
            }))
        })

        test('takes the reply session from the topic, not from a user property', async () => {
            const { transport } = await connected()
            deliver(transport, REQUEST_TOPIC, {}, { properties: {} })
            expect(handleInFlightRequest.mock.calls[0][0].sessionId).toBe('browser-session-1')
        })

        test('tolerates a request with no correlation data', async () => {
            const { transport } = await connected()
            expect(() => deliver(transport, REQUEST_TOPIC, {}, undefined)).not.toThrow()
            expect(handleInFlightRequest.mock.calls[0][0].transactionId).toBeNull()
        })

        test('passes through the chat transaction id when one is set', async () => {
            const { transport } = await connected()
            deliver(transport, REQUEST_TOPIC, {}, {
                properties: { userProperties: { transactionId: 'chat-txn-9' } }
            })
            expect(handleInFlightRequest.mock.calls[0][0].chatTransactionId).toBe('chat-txn-9')
        })

        test('ignores traffic on other channels and directions', async () => {
            const { transport } = await connected()
            deliver(transport, REQUEST_TOPIC.replace('/mcp/', '/support/'), {}, undefined)
            deliver(transport, REQUEST_TOPIC.replace('/request', '/response'), {}, undefined)
            deliver(transport, 'ff/v1/team-1/t/updated', {}, undefined)
            expect(handleInFlightRequest).not.toHaveBeenCalled()
        })
    })
})
