import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { INSIGHTS_AGENT, SUPPORT_AGENT } from '@/stores/product-expert-agents.js'

// Plain objects rather than inline literals so individual tests can flip a flag
// (e.g. isExternalMqttBrokerFeatureEnabled, isOnboarding) without redefining the mock.
const accountSettingsState = { featuresCheck: { isExpertAssistantFeatureEnabled: true } }
const contextState = { team: null, expert: {} }
const uxState = { isOnboarding: false }
const mqttService = {
    hasClient: vi.fn(() => false),
    createClient: vi.fn(() => Promise.resolve()),
    destroyClient: vi.fn(() => Promise.resolve()),
    publishMessage: vi.fn(() => Promise.resolve()),
    getManagedClient: vi.fn(() => ({ status: 'connected' }))
}

vi.mock('@/stores/account-settings.js', () => ({
    useAccountSettingsStore: vi.fn(() => accountSettingsState)
}))

vi.mock('@/stores/context.js', () => ({
    useContextStore: vi.fn(() => contextState)
}))

vi.mock('@/stores/ux.js', () => ({
    useUxStore: vi.fn(() => uxState)
}))

vi.mock('@/services/app.orchestrator', () => {
    const orchestrator = () => ({ $services: { mqtt: mqttService, automations: { dispatch, getToolDefinitions } } })
    return { default: orchestrator, getAppOrchestrator: orchestrator }
})

vi.mock('@/stores/product-assistant.js', () => ({
    useProductAssistantStore: vi.fn(() => ({
        isImmersiveInstance: null,
        supportedActions: {},
        toolCatalogHash: undefined,
        invokeActionAwaitResponse: invokeAction,
        clearSessionToolOverrides: vi.fn(),
        clearToolApprovalStatuses: vi.fn()
    }))
}))

vi.mock('@/api/expert.js', () => ({
    default: { chat: vi.fn(), getCapabilities: vi.fn().mockResolvedValue({ servers: [] }) }
}))

vi.mock('@/components/drawers/expert/ExpertDrawer.vue', () => ({
    default: { name: 'ExpertDrawer' }
}))

vi.mock('@/stores/ux-drawers.js', () => ({
    useUxDrawersStore: vi.fn(() => ({
        openRightDrawer: vi.fn(),
        setRightDrawerWider: vi.fn()
    }))
}))

const { dispatch, getToolDefinitions, invokeAction } = vi.hoisted(() => ({
    dispatch: vi.fn(() => ({ ok: true })),
    getToolDefinitions: vi.fn(() => [{ name: 'tool-a' }]),
    invokeAction: vi.fn(() => ({ done: true }))
}))

const accountAuthState = { user: null, getSessionId: () => 'browser-session-x' }
vi.mock('@/stores/account-auth.js', () => ({
    useAccountAuthStore: vi.fn(() => accountAuthState)
}))

// imported after mocks so vi.mock hoisting resolves correctly
const { useProductExpertStore } = await import('@/stores/product-expert.js')
const { useProductExpertSupportAgentStore } = await import('@/stores/product-expert-support-agent.js')
const { useProductExpertInsightsAgentStore } = await import('@/stores/product-expert-insights-agent.js')
const { useAccountAuthStore } = await import('@/stores/account-auth.js')
describe('product-expert store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        accountAuthState.user = null
        vi.clearAllMocks()
    })

    describe('initial state', () => {
        it('defaults to SUPPORT_AGENT mode', () => {
            const store = useProductExpertStore()
            expect(store.agentMode).toBe(SUPPORT_AGENT)
        })

        it('has loadingVariant equal to SUPPORT_AGENT', () => {
            const store = useProductExpertStore()
            expect(store.loadingVariant).toBe(SUPPORT_AGENT)
        })

        it('has null abortController', () => {
            const store = useProductExpertStore()
            expect(store.abortController).toBeNull()
        })
    })

    describe('_agentStore getter', () => {
        it('returns support-agent store when in SUPPORT_AGENT mode', () => {
            const store = useProductExpertStore()
            const supportAgent = useProductExpertSupportAgentStore()
            expect(store.agentMode).toBe(SUPPORT_AGENT)
            expect(store.messages).toBe(supportAgent.messages)
        })

        it('returns insights-agent store when in INSIGHTS_AGENT mode', () => {
            const store = useProductExpertStore()
            store.agentMode = INSIGHTS_AGENT
            const insightsAgent = useProductExpertInsightsAgentStore()
            expect(store.messages).toBe(insightsAgent.messages)
        })
    })

    describe('isWaitingForResponse getter', () => {
        it('is false when abortController is null', () => {
            const store = useProductExpertStore()
            expect(store.isWaitingForResponse).toBe(false)
        })

        it('is true when abortController is set', () => {
            const store = useProductExpertStore()
            store.setAbortController(new AbortController())
            expect(store.isWaitingForResponse).toBe(true)
        })
    })

    describe('messages getters', () => {
        it('hasMessages is false when agent store has no messages', () => {
            const store = useProductExpertStore()
            expect(store.hasMessages).toBe(false)
        })

        it('hasMessages is true when agent store has messages', () => {
            const store = useProductExpertStore()
            useProductExpertSupportAgentStore().messages.push({ _type: 'human', content: 'hello' })
            expect(store.hasMessages).toBe(true)
        })
    })

    describe('isSupportAgent / isInsightsAgent', () => {
        it('isSupportAgent is true by default', () => {
            const store = useProductExpertStore()
            expect(store.isSupportAgent).toBe(true)
            expect(store.isInsightsAgent).toBe(false)
        })

        it('isInsightsAgent is true when mode is INSIGHTS_AGENT', () => {
            const store = useProductExpertStore()
            store.agentMode = INSIGHTS_AGENT
            expect(store.isInsightsAgent).toBe(true)
            expect(store.isSupportAgent).toBe(false)
        })
    })

    describe('setAgentMode', () => {
        it('sets a valid mode', () => {
            const store = useProductExpertStore()
            store.setAgentMode(INSIGHTS_AGENT)
            expect(store.agentMode).toBe(INSIGHTS_AGENT)
        })

        it('ignores an invalid mode', () => {
            const store = useProductExpertStore()
            store.setAgentMode('invalid-mode')
            expect(store.agentMode).toBe(SUPPORT_AGENT)
        })
    })

    describe('setAbortController', () => {
        it('stores the controller on the active agent store', () => {
            const store = useProductExpertStore()
            const controller = new AbortController()
            store.setAbortController(controller)
            expect(useProductExpertSupportAgentStore().abortController).toBe(controller)
        })

        it('clears the controller when passed null', () => {
            const store = useProductExpertStore()
            store.setAbortController(new AbortController())
            store.setAbortController(null)
            expect(useProductExpertSupportAgentStore().abortController).toBeNull()
        })
    })

    describe('addUserMessage', () => {
        it('pushes a human message with correct format', () => {
            const store = useProductExpertStore()
            store.addUserMessage('hello')
            const messages = useProductExpertSupportAgentStore().messages
            expect(messages).toHaveLength(1)
            expect(messages[0]._type).toBe('human')
            expect(messages[0].content).toBe('hello')
            expect(messages[0]._uuid).toBeDefined()
            expect(messages[0]._timestamp).toBeDefined()
        })
    })

    describe('addAiMessage', () => {
        it('pushes an ai message with mapped answer array', () => {
            const store = useProductExpertStore()
            store.addAiMessage({ answer: [{ kind: 'chat', content: 'hi' }] })
            const messages = useProductExpertSupportAgentStore().messages
            expect(messages).toHaveLength(1)
            expect(messages[0]._type).toBe('ai')
            expect(messages[0]._streamed).toBe(false)
            expect(messages[0]._uuid).toBeDefined()
            expect(messages[0].answer).toHaveLength(1)
            expect(messages[0].answer[0].content).toBe('hi')
            expect(messages[0].answer[0]._uuid).toBeDefined()
            expect(messages[0].answer[0]._streamed).toBe(false)
        })

        it('uses an empty answer array when answer is absent', () => {
            const store = useProductExpertStore()
            store.addAiMessage({})
            expect(useProductExpertSupportAgentStore().messages[0].answer).toEqual([])
        })
    })

    describe('addPredefinedAiMessage', () => {
        it('pushes an ai message with a single-item answer array', () => {
            const store = useProductExpertStore()
            store.addPredefinedAiMessage('Generation stopped.')
            const messages = useProductExpertSupportAgentStore().messages
            expect(messages).toHaveLength(1)
            expect(messages[0]._type).toBe('ai')
            expect(messages[0]._streamed).toBe(false)
            expect(messages[0].answer).toHaveLength(1)
            expect(messages[0].answer[0].content).toBe('Generation stopped.')
            expect(messages[0].answer[0]._streamed).toBe(false)
            expect(messages[0].answer[0]._uuid).toBeDefined()
        })
    })

    describe('addSystemMessage', () => {
        it('pushes a system message with correct format', () => {
            const store = useProductExpertStore()
            store.addSystemMessage({ message: 'Session expiring soon.', type: 'warning' })
            const messages = useProductExpertSupportAgentStore().messages
            expect(messages).toHaveLength(1)
            expect(messages[0]._type).toBe('system')
            expect(messages[0]._variant).toBe('warning')
            expect(messages[0].message).toBe('Session expiring soon.')
            expect(messages[0]._uuid).toBeDefined()
            expect(messages[0]._timestamp).toBeDefined()
        })

        it('does not push when type is invalid', () => {
            const store = useProductExpertStore()
            store.addSystemMessage({ message: 'Something', type: 'invalid' })
            expect(useProductExpertSupportAgentStore().messages).toHaveLength(0)
        })

        it('does not push when message is empty', () => {
            const store = useProductExpertStore()
            store.addSystemMessage({ message: '', type: 'warning' })
            expect(useProductExpertSupportAgentStore().messages).toHaveLength(0)
        })
    })

    describe('updateMessageStreamedState', () => {
        it('marks a message as streamed by uuid', () => {
            const store = useProductExpertStore()
            store.addPredefinedAiMessage('hello')
            const msg = useProductExpertSupportAgentStore().messages[0]
            expect(msg._streamed).toBe(false)
            store.updateMessageStreamedState(msg._uuid)
            expect(msg._streamed).toBe(true)
        })

        it('searches insights-agent messages if not found in support-agent', () => {
            const store = useProductExpertStore()
            store.agentMode = INSIGHTS_AGENT
            store.addPredefinedAiMessage('hello')
            const msg = useProductExpertInsightsAgentStore().messages[0]
            store.agentMode = SUPPORT_AGENT // switch back, message is still in insights-agent
            store.updateMessageStreamedState(msg._uuid)
            expect(msg._streamed).toBe(true)
        })
    })

    describe('updateAnswerStreamedState', () => {
        it('marks a specific answer item as streamed', () => {
            const store = useProductExpertStore()
            store.addAiMessage({ answer: [{ kind: 'chat', content: 'hi' }] })
            const msg = useProductExpertSupportAgentStore().messages[0]
            const answer = msg.answer[0]
            expect(answer._streamed).toBe(false)
            store.updateAnswerStreamedState({ messageUuid: msg._uuid, answerUuid: answer._uuid })
            expect(answer._streamed).toBe(true)
        })

        it('does nothing when the message uuid is not found', () => {
            const store = useProductExpertStore()
            expect(() => store.updateAnswerStreamedState({ messageUuid: 'nope', answerUuid: 'nope' })).not.toThrow()
        })
    })

    describe('shouldWakeUpAssistant / setContext / clearWakeUp', () => {
        it('has shouldWakeUpAssistant false by default', () => {
            const store = useProductExpertStore()
            expect(store.shouldWakeUpAssistant).toBe(false)
        })

        it('setContext sets context and sessionId on the support-agent store', () => {
            const store = useProductExpertStore()
            const supportAgent = useProductExpertSupportAgentStore()
            store.setContext({ data: { history: [] }, sessionId: 'abc' })
            expect(supportAgent.context).toEqual({ history: [] })
            expect(supportAgent.sessionId).toBe('abc')
        })

        it('setContext sets shouldWakeUpAssistant to true', () => {
            const store = useProductExpertStore()
            store.setContext({ data: {} })
            expect(store.shouldWakeUpAssistant).toBe(true)
        })

        it('setContext does not set sessionId when not provided', () => {
            const store = useProductExpertStore()
            const supportAgent = useProductExpertSupportAgentStore()
            store.setContext({ data: {} })
            expect(supportAgent.sessionId).toBeNull()
        })

        it('setContext does nothing when feature is disabled', async () => {
            const { useAccountSettingsStore } = await import('@/stores/account-settings.js')
            vi.mocked(useAccountSettingsStore).mockReturnValueOnce({ featuresCheck: { isExpertAssistantFeatureEnabled: false } })
            const store = useProductExpertStore()
            store.setContext({ data: { history: [] } })
            expect(store.shouldWakeUpAssistant).toBe(false)
        })

        it('clearWakeUp sets shouldWakeUpAssistant back to false', () => {
            const store = useProductExpertStore()
            store.setContext({ data: {} })
            expect(store.shouldWakeUpAssistant).toBe(true)
            store.clearWakeUp()
            expect(store.shouldWakeUpAssistant).toBe(false)
        })
    })

    describe('openConversation', () => {
        it('sends a turn with no query', async () => {
            const store = useProductExpertStore()
            const sendQuery = vi.spyOn(store, 'sendQuery').mockResolvedValue(undefined)

            await store.openConversation()

            expect(sendQuery).toHaveBeenCalledWith({ query: '' })
        })

        // The user has not said anything, so nothing of theirs belongs in the
        // transcript
        it('adds no user message', async () => {
            const store = useProductExpertStore()
            vi.spyOn(store, 'sendQuery').mockResolvedValue(undefined)

            await store.openConversation()

            expect(store.messages).toHaveLength(0)
        })

        // The expiry window should start when the user replies, not while they
        // are still reading the opening question
        it('does not start the session clock', async () => {
            const store = useProductExpertStore()
            const supportAgent = useProductExpertSupportAgentStore()
            vi.spyOn(store, 'sendQuery').mockResolvedValue(undefined)

            await store.openConversation()

            expect(supportAgent.sessionStartTime).toBe(null)
        })

        it('gives the session an id', async () => {
            const store = useProductExpertStore()
            const supportAgent = useProductExpertSupportAgentStore()
            vi.spyOn(store, 'sendQuery').mockResolvedValue(undefined)

            await store.openConversation()

            expect(supportAgent.sessionId).toBeTruthy()
        })

        it('clears the abort controller when the turn settles', async () => {
            const store = useProductExpertStore()
            const supportAgent = useProductExpertSupportAgentStore()
            vi.spyOn(store, 'sendQuery').mockResolvedValue(undefined)

            await store.openConversation()

            expect(supportAgent.abortController).toBe(null)
        })

        it('surfaces a failure to the user rather than leaving a blank page', async () => {
            const store = useProductExpertStore()
            vi.spyOn(store, 'sendQuery').mockRejectedValue(new Error('broker down'))

            await store.openConversation()

            expect(store.messages).toHaveLength(1)
            expect(store.messages[0].error).toBe(true)
        })

        it('says nothing when the turn was aborted', async () => {
            const store = useProductExpertStore()
            const aborted = new Error('aborted')
            aborted.name = 'AbortError'
            vi.spyOn(store, 'sendQuery').mockRejectedValue(aborted)

            await store.openConversation()

            expect(store.messages).toHaveLength(0)
        })
    })

    describe('reset', () => {
        it('calls reset on the active agent store and resets own state', () => {
            const store = useProductExpertStore()
            const supportAgent = useProductExpertSupportAgentStore()
            store.addUserMessage('hi')
            store.loadingVariant = 'transfer'

            store.reset()

            expect(supportAgent.messages).toHaveLength(0)
            expect(store.loadingVariant).toBe(SUPPORT_AGENT)
        })
    })

    describe('stopInflightChat', () => {
        it('clears the task list and loading line and records no completion', () => {
            const store = useProductExpertStore()
            const agent = useProductExpertSupportAgentStore()
            agent.activeTaskList = {
                planId: null, title: 'Tasks', items: [{ id: 't1', text: 'x', status: 'in_progress' }]
            }
            agent.inFlightRequests.set('turn-1', { query: 'x', transactionId: 'turn-1' })
            store._addInFlightUpdate('Working...')

            store.stopInflightChat()

            expect(store.activeTaskList).toBeNull()
            expect(store.inFlightUpdates).toHaveLength(0)
            expect(agent.inFlightRequests.size).toBe(0)
            expect(agent.recentlyCompletedTransactions.size).toBe(0)
        })
    })

    describe('inflight correlation', () => {
        const encoder = new TextEncoder()
        const packet = (transactionId, chatTransactionId, sessionId = 'chat-1') => ({
            properties: {
                correlationData: encoder.encode(transactionId),
                userProperties: { sessionId, transactionId: chatTransactionId }
            }
        })
        const taskTopic = 'ff/v1/expert/u1/chat-1/team/t1/support/inflight/expert:tasks/request'
        const callToolTopic = 'ff/v1/expert/u1/chat-1/team/t1/support/inflight/automation-ui:mcp-call-tool/request'
        const replyTopic = 'ff/v1/expert/u1/chat-1/team/t1/support/chat/response'
        const tasksMessage = JSON.stringify({ items: [{ id: 't1', text: 'Do a thing', status: 'done' }], title: 'Tasks', planId: 'p1' })

        let store
        let agent
        beforeEach(() => {
            accountAuthState.user = { id: 'u1' }
            store = useProductExpertStore()
            agent = useProductExpertSupportAgentStore()
            agent.sessionId = 'chat-1'
        })

        it('applies and acks a task surface while its turn is live', async () => {
            agent.inFlightRequests.set('turn-1', { query: 'x', transactionId: 'turn-1' })

            await store._onMqttMessage(taskTopic, tasksMessage, packet('srf-1', 'turn-1'))

            expect(store.activeTaskList).toEqual({
                planId: 'p1', title: 'Tasks', items: [{ id: 't1', text: 'Do a thing', status: 'done' }]
            })
            expect(mqttService.publishMessage).toHaveBeenCalledTimes(1)
            expect(JSON.parse(mqttService.publishMessage.mock.calls[0][1].payload)).toEqual({ ack: true })
        })

        it('applies a surface trailing the final reply, then drops one from a turn it never saw', async () => {
            agent.inFlightRequests.set('turn-1', { query: 'x', transactionId: 'turn-1' })

            await store._onMqttMessage(replyTopic, JSON.stringify({}), packet('turn-1', 'turn-1'))
            expect(agent.inFlightRequests.size).toBe(0)
            expect(agent.recentlyCompletedTransactions.has('turn-1')).toBe(true)

            await store._onMqttMessage(taskTopic, tasksMessage, packet('srf-1', 'turn-1'))
            expect(store.activeTaskList).not.toBeNull()
            expect(mqttService.publishMessage).toHaveBeenCalledTimes(1)

            mqttService.publishMessage.mockClear()
            await store._onMqttMessage(taskTopic, tasksMessage, packet('srf-2', 'turn-0'))
            expect(mqttService.publishMessage).not.toHaveBeenCalled()
        })

        it('drops a surface and an automation left on the wire after a stop', async () => {
            agent.inFlightRequests.set('turn-1', { query: 'x', transactionId: 'turn-1' })
            store.stopInflightChat()

            await store._onMqttMessage(taskTopic, tasksMessage, packet('srf-1', 'turn-1'))
            expect(store.activeTaskList).toBeNull()
            expect(mqttService.publishMessage).not.toHaveBeenCalled()

            await store._onMqttMessage(callToolTopic, JSON.stringify({ data: { name: 'open-node', input: {} } }), packet('srf-2', 'turn-1'))
            expect(dispatch).not.toHaveBeenCalled()
            expect(mqttService.publishMessage).not.toHaveBeenCalled()
        })

        it('runs an automation and answers with its result while the turn is live', async () => {
            agent.inFlightRequests.set('turn-1', { query: 'x', transactionId: 'turn-1' })

            await store._onMqttMessage(callToolTopic, JSON.stringify({ data: { name: 'open-node', input: { id: 'n1' } } }), packet('srf-1', 'turn-1'))

            expect(dispatch).toHaveBeenCalledWith('open-node', { id: 'n1' })
            expect(mqttService.publishMessage).toHaveBeenCalledTimes(1)
            expect(JSON.parse(mqttService.publishMessage.mock.calls[0][1].payload)).toEqual({ ok: true })
        })
    })

    describe('relayInstanceReady', () => {
        afterEach(() => {
            contextState.team = null
            uxState.isOnboarding = false
            delete accountSettingsState.featuresCheck.isExternalMqttBrokerFeatureEnabled
            mqttService.hasClient.mockReturnValue(false)
        })

        it('does not publish when the instance has no id', async () => {
            uxState.isOnboarding = true
            accountSettingsState.featuresCheck.isExternalMqttBrokerFeatureEnabled = true

            await useProductExpertStore().relayInstanceReady({ name: 'no-id' })

            expect(mqttService.publishMessage).not.toHaveBeenCalled()
        })

        it('does not publish outside an active onboarding conversation', async () => {
            uxState.isOnboarding = false
            accountSettingsState.featuresCheck.isExternalMqttBrokerFeatureEnabled = true

            await useProductExpertStore().relayInstanceReady({ id: 'inst-1', name: 'my-instance' })

            expect(mqttService.publishMessage).not.toHaveBeenCalled()
        })

        it('does not publish when the chat is not using the Expert MQTT channel', async () => {
            uxState.isOnboarding = true
            accountSettingsState.featuresCheck.isExternalMqttBrokerFeatureEnabled = false

            await useProductExpertStore().relayInstanceReady({ id: 'inst-1', name: 'my-instance' })

            expect(mqttService.publishMessage).not.toHaveBeenCalled()
        })

        it('publishes a silent system message on the chat request topic', async () => {
            uxState.isOnboarding = true
            accountSettingsState.featuresCheck.isExternalMqttBrokerFeatureEnabled = true
            contextState.team = { id: 'team-1' }
            mqttService.hasClient.mockReturnValue(true)
            useAccountAuthStore().user = { id: 'user-1' }
            useProductExpertSupportAgentStore().sessionId = 'session-xyz'

            await useProductExpertStore().relayInstanceReady({ id: 'inst-1', name: 'my-instance' })

            expect(mqttService.createClient).not.toHaveBeenCalled()
            expect(mqttService.publishMessage).toHaveBeenCalledTimes(1)
            const [connectionKey, message] = mqttService.publishMessage.mock.calls[0]
            expect(connectionKey).toBe('expert/support-agent')
            expect(message.topic).toBe('ff/v1/expert/user-1/session-xyz/t/team-1/support/chat/request')
            expect(message.qos).toBe(2)
            expect(message.payload).toEqual({
                system: {
                    kind: 'instance-ready',
                    instance: { id: 'inst-1', name: 'my-instance' },
                    state: 'running'
                },
                context: { agent: SUPPORT_AGENT }
            })
            expect(message.userProperties.sessionId).toBe('session-xyz')
        })

        // Without this, the reply is a normal chat message the agent sends back on the
        // response topic, but the store's in-flight guard drops anything it never
        // registered - so it must be published like a real request, not a fire-and-forget one.
        it('registers the request as in-flight, keyed by its correlation data', async () => {
            uxState.isOnboarding = true
            accountSettingsState.featuresCheck.isExternalMqttBrokerFeatureEnabled = true
            contextState.team = { id: 'team-1' }
            mqttService.hasClient.mockReturnValue(true)
            useAccountAuthStore().user = { id: 'user-1' }
            const supportAgent = useProductExpertSupportAgentStore()
            supportAgent.sessionId = 'session-xyz'

            await useProductExpertStore().relayInstanceReady({ id: 'inst-1', name: 'my-instance' })

            const [, message] = mqttService.publishMessage.mock.calls[0]
            expect(message.correlationData).toBeTruthy()
            expect(supportAgent.inFlightRequests.size).toBe(1)
            expect(supportAgent.inFlightRequests.get(message.correlationData)).toEqual({
                query: '',
                transactionId: message.correlationData
            })
        })

        it('does not add a user message to the transcript', async () => {
            uxState.isOnboarding = true
            accountSettingsState.featuresCheck.isExternalMqttBrokerFeatureEnabled = true
            contextState.team = { id: 'team-1' }
            mqttService.hasClient.mockReturnValue(true)
            useAccountAuthStore().user = { id: 'user-1' }

            const store = useProductExpertStore()
            await store.relayInstanceReady({ id: 'inst-1', name: 'my-instance' })

            expect(store.messages).toHaveLength(0)
        })

        it('shows the standard loading indicator while the reply is outstanding', async () => {
            uxState.isOnboarding = true
            accountSettingsState.featuresCheck.isExternalMqttBrokerFeatureEnabled = true
            contextState.team = { id: 'team-1' }
            mqttService.hasClient.mockReturnValue(true)
            useAccountAuthStore().user = { id: 'user-1' }

            const store = useProductExpertStore()
            await store.relayInstanceReady({ id: 'inst-1', name: 'my-instance' })

            expect(store.isWaitingForResponse).toBe(true)
        })

        it('renders the agent reply and clears the in-flight entry when it arrives', async () => {
            uxState.isOnboarding = true
            accountSettingsState.featuresCheck.isExternalMqttBrokerFeatureEnabled = true
            contextState.team = { id: 'team-1' }
            mqttService.hasClient.mockReturnValue(true)
            useAccountAuthStore().user = { id: 'user-1' }
            const supportAgent = useProductExpertSupportAgentStore()
            supportAgent.sessionId = 'session-xyz'

            const store = useProductExpertStore()
            await store.relayInstanceReady({ id: 'inst-1', name: 'my-instance' })

            const [, request] = mqttService.publishMessage.mock.calls[0]
            const transactionId = request.correlationData

            const responseTopic = 'ff/v1/expert/user-1/session-xyz/t/team-1/support/chat/response'
            const responsePayload = { answer: [{ content: 'Your workspace is ready.' }] }
            const packet = { properties: { correlationData: Buffer.from(transactionId) } }

            await store._onMqttMessage(responseTopic, Buffer.from(JSON.stringify(responsePayload)), packet)

            expect(store.messages).toHaveLength(1)
            expect(store.messages[0].answer[0].content).toBe('Your workspace is ready.')
            expect(supportAgent.inFlightRequests.size).toBe(0)
            expect(store.isWaitingForResponse).toBe(false)
        })

        it('establishes the mqtt connection first when none exists yet', async () => {
            uxState.isOnboarding = true
            accountSettingsState.featuresCheck.isExternalMqttBrokerFeatureEnabled = true
            contextState.team = { id: 'team-1' }
            mqttService.hasClient.mockReturnValue(false)
            useAccountAuthStore().user = { id: 'user-1' }

            await useProductExpertStore().relayInstanceReady({ id: 'inst-1', name: 'my-instance' })

            expect(mqttService.createClient).toHaveBeenCalledTimes(1)
            expect(mqttService.publishMessage).toHaveBeenCalledTimes(1)
        })

        it('defaults a missing instance name to null', async () => {
            uxState.isOnboarding = true
            accountSettingsState.featuresCheck.isExternalMqttBrokerFeatureEnabled = true
            contextState.team = { id: 'team-1' }
            mqttService.hasClient.mockReturnValue(true)
            useAccountAuthStore().user = { id: 'user-1' }

            await useProductExpertStore().relayInstanceReady({ id: 'inst-1' })

            const [, message] = mqttService.publishMessage.mock.calls[0]
            expect(message.payload.system.instance).toEqual({ id: 'inst-1', name: null })
        })

        it('does not announce the same instance twice in one conversation', async () => {
            uxState.isOnboarding = true
            accountSettingsState.featuresCheck.isExternalMqttBrokerFeatureEnabled = true
            contextState.team = { id: 'team-1' }
            mqttService.hasClient.mockReturnValue(true)
            useAccountAuthStore().user = { id: 'user-1' }

            const store = useProductExpertStore()
            await store.relayInstanceReady({ id: 'inst-1', name: 'my-instance' })
            await store.relayInstanceReady({ id: 'inst-1', name: 'my-instance' })

            expect(mqttService.publishMessage).toHaveBeenCalledTimes(1)
        })

        it('still announces a different instance after one has already been announced', async () => {
            uxState.isOnboarding = true
            accountSettingsState.featuresCheck.isExternalMqttBrokerFeatureEnabled = true
            contextState.team = { id: 'team-1' }
            mqttService.hasClient.mockReturnValue(true)
            useAccountAuthStore().user = { id: 'user-1' }

            const store = useProductExpertStore()
            await store.relayInstanceReady({ id: 'inst-1', name: 'first' })
            await store.relayInstanceReady({ id: 'inst-2', name: 'second' })

            expect(mqttService.publishMessage).toHaveBeenCalledTimes(2)
        })

        it('allows announcing the same instance again after Start Over', async () => {
            uxState.isOnboarding = true
            accountSettingsState.featuresCheck.isExternalMqttBrokerFeatureEnabled = true
            contextState.team = { id: 'team-1' }
            mqttService.hasClient.mockReturnValue(true)
            useAccountAuthStore().user = { id: 'user-1' }

            const store = useProductExpertStore()
            await store.relayInstanceReady({ id: 'inst-1', name: 'my-instance' })
            await store.startOver()
            await store.relayInstanceReady({ id: 'inst-1', name: 'my-instance' })

            expect(mqttService.publishMessage).toHaveBeenCalledTimes(2)
        })
    })
})
