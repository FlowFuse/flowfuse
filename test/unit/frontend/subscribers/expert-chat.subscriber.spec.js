import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const initiateExpertChat = vi.fn()

const authStore = { user: { id: 'user-1' }, getSessionId: () => 'browser-session-1' }
const supportAgentStore = { sessionId: 'chat-1', mqttConnectionKey: 'expert/support-agent' }
const expertStore = {
    sessionId: 'active-agent-session',
    receiveChatReply: vi.fn(() => Promise.resolve()),
    receiveChatInflight: vi.fn(() => Promise.resolve()),
    onChatConnected: vi.fn(),
    onChatConnectionClosed: vi.fn(),
    handleMqttError: vi.fn()
}

const useAccountAuthStore = vi.fn(() => authStore)
const useProductExpertStore = vi.fn(() => expertStore)
const useContextStore = vi.fn(() => ({ team: { id: 'team-1' } }))

vi.mock('@/api/user.js', () => ({
    default: { initiateExpertChat: (...args) => initiateExpertChat(...args) }
}))
vi.mock('@/stores/account-auth.js', () => ({ useAccountAuthStore }))
vi.mock('@/stores/product-expert.js', () => ({ useProductExpertStore }))
vi.mock('@/stores/product-expert-support-agent.js', () => ({ useProductExpertSupportAgentStore: () => supportAgentStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore }))
// the topic helper reaches for the stores through the barrel
vi.mock('@/stores', () => ({ useAccountAuthStore, useProductExpertStore, useContextStore }))

function makeTransport () {
    return {
        attach: vi.fn().mockImplementation(async (key) => ({ key, id: 1 })),
        subscribe: vi.fn().mockResolvedValue(undefined),
        detach: vi.fn().mockResolvedValue(undefined)
    }
}

const REPLY_TOPIC = 'ff/v1/expert/user-1/chat-1/p/instance-1/support/chat/response'
const INFLIGHT_TOPIC = 'ff/v1/expert/user-1/chat-1/p/instance-1/support/inflight/automation:get-nodes/request'

describe('Expert support chat subscriber', async () => {
    const { createSupportChatSubscriber, destroySupportChatSubscriber } = await import('../../../../frontend/src/subscribers/expert-chat.subscriber.ts')

    function handlers (transport) {
        return transport.attach.mock.calls[0][1]
    }

    async function connected () {
        const transport = makeTransport()
        const subscriber = createSupportChatSubscriber({ app: {}, router: {}, transport })
        await subscriber.connect({ id: 'team-1' })
        // the transport invokes onConnect once the client is up
        await handlers(transport).onConnect({})
        return { subscriber, transport }
    }

    beforeEach(async () => {
        vi.clearAllMocks()
        supportAgentStore.sessionId = 'chat-1'
        await destroySupportChatSubscriber()
    })

    afterEach(async () => {
        await destroySupportChatSubscriber()
    })

    describe('connection', () => {
        test('rides the agent connection with chat credentials for the agent session', async () => {
            const { transport } = await connected()
            expect(transport.attach.mock.calls[0][0]).toBe('expert/support-agent')
            await handlers(transport).getCredentials()
            expect(initiateExpertChat).toHaveBeenCalledWith({ sessionId: 'chat-1' })
        })

        test('subscribes to the agent chat responses and in-flight requests at qos 2', async () => {
            const { transport } = await connected()
            expect(transport.subscribe).toHaveBeenCalledWith('expert/support-agent', [
                'ff/v1/expert/user-1/chat-1/+/+/support/chat/response',
                'ff/v1/expert/user-1/chat-1/+/+/support/inflight/+/request'
            ], { qos: 2 })
            expect(expertStore.onChatConnected).toHaveBeenCalledTimes(1)
        })

        test('keeps the session it connected with across reconnects', async () => {
            const { subscriber, transport } = await connected()
            supportAgentStore.sessionId = 'chat-2'
            await subscriber.connect({ id: 'team-2' })
            await handlers(transport).onConnect({})
            await handlers(transport).getCredentials()

            expect(transport.attach).toHaveBeenCalledTimes(1)
            expect(transport.subscribe.mock.calls[1][1][0]).toContain('/chat-1/')
            expect(initiateExpertChat).toHaveBeenCalledWith({ sessionId: 'chat-1' })
        })

        test('takes the new session after a disconnect', async () => {
            const { subscriber, transport } = await connected()
            await subscriber.disconnect()
            supportAgentStore.sessionId = 'chat-2'
            await subscriber.connect({ id: 'team-1' })

            expect(transport.detach).toHaveBeenCalledTimes(1)
            await transport.attach.mock.calls[1][1].getCredentials()
            expect(initiateExpertChat).toHaveBeenCalledWith({ sessionId: 'chat-2' })
        })

        test('reports a refused connection without subscribing', async () => {
            const transport = makeTransport()
            const subscriber = createSupportChatSubscriber({ app: {}, router: {}, transport })
            await subscriber.connect({ id: 'team-1' })
            await handlers(transport).onConnect({ reasonCode: 0x87, properties: { reasonString: 'not authorized' } })

            expect(expertStore.handleMqttError).toHaveBeenCalledWith(0x87, 'not authorized')
            expect(transport.subscribe).not.toHaveBeenCalled()
            expect(expertStore.onChatConnected).not.toHaveBeenCalled()
        })

        test('reports a failed subscription as a connection error', async () => {
            const transport = makeTransport()
            transport.subscribe.mockRejectedValueOnce(Object.assign(new Error('refused'), { code: 0x87 }))
            const subscriber = createSupportChatSubscriber({ app: {}, router: {}, transport })
            await subscriber.connect({ id: 'team-1' })
            await handlers(transport).onConnect({})

            expect(expertStore.handleMqttError).toHaveBeenCalledWith(0x87, 'refused')
            expect(expertStore.onChatConnected).not.toHaveBeenCalled()
        })

        test('passes the link going down to the store', async () => {
            const { transport } = await connected()
            handlers(transport).onClose()
            handlers(transport).onDisconnect({ reasonCode: 0x8E, properties: { reasonString: 'taken over' } })
            handlers(transport).onError(Object.assign(new Error('keepalive timeout'), { code: null }))

            expect(expertStore.onChatConnectionClosed).toHaveBeenCalledTimes(1)
            expect(expertStore.handleMqttError).toHaveBeenCalledWith(0x8E, 'taken over')
            expect(expertStore.handleMqttError).toHaveBeenCalledWith(null, 'keepalive timeout')
        })
    })

    describe('messages', () => {
        function deliver (transport, topic, payload, packet) {
            return handlers(transport).onMessage(topic, JSON.stringify(payload), packet)
        }

        test('hands a reply to the store with its correlation id', async () => {
            const { transport } = await connected()
            deliver(transport, REPLY_TOPIC, { answer: [] }, {
                properties: { correlationData: new TextEncoder().encode('turn-1') }
            })

            expect(expertStore.receiveChatReply).toHaveBeenCalledWith({ agent: 'support-agent', transactionId: 'turn-1', payload: { answer: [] } })
            expect(expertStore.receiveChatInflight).not.toHaveBeenCalled()
        })

        test('hands an in-flight request to the store with its session and turn', async () => {
            const { transport } = await connected()
            deliver(transport, INFLIGHT_TOPIC, { params: {} }, {
                properties: {
                    correlationData: new TextEncoder().encode('srf-1'),
                    userProperties: { sessionId: 'chat-1', transactionId: 'turn-1' }
                }
            })

            expect(expertStore.receiveChatInflight).toHaveBeenCalledWith({
                agent: 'support-agent',
                topic: INFLIGHT_TOPIC,
                payload: { params: {} },
                transactionId: 'srf-1',
                sessionId: 'chat-1',
                chatTransactionId: 'turn-1'
            })
        })

        test('ignores the other agent channel', async () => {
            const { transport } = await connected()
            deliver(transport, REPLY_TOPIC.replace('/support/', '/insights/'), {}, {})
            expect(expertStore.receiveChatReply).not.toHaveBeenCalled()
        })

        test('logs a reply the store fails to handle', async () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
            expertStore.receiveChatReply.mockRejectedValueOnce(new Error('render failed'))
            const { transport } = await connected()
            deliver(transport, REPLY_TOPIC, {}, {})

            await vi.waitFor(() => expect(warn).toHaveBeenCalledWith('[expertSupportChat] chat reply failed:', expect.any(Error)))
            warn.mockRestore()
        })
    })
})
