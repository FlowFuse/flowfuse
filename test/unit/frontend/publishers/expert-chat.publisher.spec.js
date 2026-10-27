import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const initiateExpertChat = vi.fn()

const authStore = { user: { id: 'user-1' }, getSessionId: () => 'browser-session-1' }
const supportAgentStore = { sessionId: 'chat-1', mqttConnectionKey: 'expert/support-agent' }
const contextStore = { team: { id: 'team-1' }, instance: null, device: null, application: null, expert: { teamId: 'team-1', pageName: 'home' } }

const useAccountAuthStore = vi.fn(() => authStore)
const useContextStore = vi.fn(() => contextStore)

vi.mock('@/api/user.js', () => ({
    default: { initiateExpertChat: (...args) => initiateExpertChat(...args) }
}))
vi.mock('@/stores/account-auth.js', () => ({ useAccountAuthStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore }))
vi.mock('@/stores/product-expert-support-agent.js', () => ({ useProductExpertSupportAgentStore: () => supportAgentStore }))
// the topic helper reaches for the stores through the barrel
vi.mock('@/stores', () => ({ useAccountAuthStore, useContextStore }))

function makeTransport () {
    return {
        attach: vi.fn().mockImplementation(async (key) => ({ key, id: 1 })),
        publish: vi.fn().mockResolvedValue(undefined),
        detach: vi.fn().mockResolvedValue(undefined)
    }
}

describe('Expert support chat publisher', async () => {
    const { createSupportChatPublisher, destroySupportChatPublisher } = await import('../../../../frontend/src/publishers/expert-chat.publisher.ts')

    function handlers (transport) {
        return transport.attach.mock.calls[0][1]
    }

    async function connected () {
        const transport = makeTransport()
        const publisher = createSupportChatPublisher({ app: {}, router: {}, transport })
        await publisher.connect({ id: 'team-1' })
        handlers(transport).onConnect({})
        return { publisher, transport }
    }

    beforeEach(async () => {
        vi.clearAllMocks()
        supportAgentStore.sessionId = 'chat-1'
        await destroySupportChatPublisher()
    })

    afterEach(async () => {
        await destroySupportChatPublisher()
    })

    describe('connection', () => {
        test('rides the agent connection with chat credentials for the agent session', async () => {
            const { transport } = await connected()
            expect(transport.attach.mock.calls[0][0]).toBe('expert/support-agent')
            await handlers(transport).getCredentials()
            expect(initiateExpertChat).toHaveBeenCalledWith({ sessionId: 'chat-1' })
        })

        test('reports the link up once connected and down when it drops', async () => {
            const transport = makeTransport()
            const publisher = createSupportChatPublisher({ app: {}, router: {}, transport })
            await publisher.connect({ id: 'team-1' })
            expect(publisher.isLinkUp()).toBe(false)

            handlers(transport).onConnect({})
            expect(publisher.isLinkUp()).toBe(true)

            handlers(transport).onClose()
            expect(publisher.isLinkUp()).toBe(false)

            handlers(transport).onConnect({})
            await publisher.disconnect()
            expect(publisher.isLinkUp()).toBe(false)
        })

        test('keeps the session it connected with until it disconnects', async () => {
            const { publisher, transport } = await connected()
            supportAgentStore.sessionId = 'chat-2'
            await publisher.connect({ id: 'team-2' })
            await publisher.request({ query: 'hello' }, 'turn-1')

            expect(transport.attach).toHaveBeenCalledTimes(1)
            expect(transport.publish.mock.calls[0][1].topic).toContain('/chat-1/')
        })
    })

    describe('sending', () => {
        test('publishes a chat request with its context, correlation id and session', async () => {
            const { publisher, transport } = await connected()
            await publisher.request({ query: 'hello' }, 'turn-1')

            expect(transport.publish).toHaveBeenCalledWith('expert/support-agent', {
                topic: 'ff/v1/expert/user-1/chat-1/t/team-1/support/chat/request',
                qos: 2,
                payload: {
                    query: 'hello',
                    context: { teamId: 'team-1', pageName: 'home', agent: 'support-agent' }
                },
                correlationData: 'turn-1',
                userProperties: { sessionId: 'chat-1', origin: window.origin || window.location.origin }
            })
        })

        test('aborts a turn on the request topic under its correlation id', async () => {
            const { publisher, transport } = await connected()
            await publisher.abort('turn-1')

            const [, message] = transport.publish.mock.calls[0]
            expect(message.topic).toBe('ff/v1/expert/user-1/chat-1/t/team-1/support/chat/request')
            expect(message.payload.abort).toBe(true)
            expect(message.correlationData).toBe('turn-1')
        })

        test('answers an in-flight request on the given topic', async () => {
            const { publisher, transport } = await connected()
            const topic = 'ff/v1/expert/user-1/chat-1/p/instance-1/support/inflight/expert:tasks/response'
            await publisher.respond(topic, { body: { ack: true }, transactionId: 'srf-1', sessionId: 'chat-1', chatTransactionId: 'turn-1' })

            expect(transport.publish).toHaveBeenCalledWith('expert/support-agent', {
                topic,
                qos: 2,
                payload: JSON.stringify({ ack: true }),
                correlationData: 'srf-1',
                userProperties: { sessionId: 'chat-1', transactionId: 'turn-1', origin: window.origin || window.location.origin }
            })
        })

        test('fails a send while not connected instead of dropping it', async () => {
            const transport = makeTransport()
            const publisher = createSupportChatPublisher({ app: {}, router: {}, transport })

            await expect(publisher.request({ query: 'hello' }, 'turn-1')).rejects.toThrow('not connected')
            expect(transport.publish).not.toHaveBeenCalled()
        })
    })
})
