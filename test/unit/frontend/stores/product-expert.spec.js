import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { INSIGHTS_AGENT, OPERATOR_AGENT } from '@/stores/product-expert-agents.js'

vi.mock('@/stores/_account_bridge.js', () => ({
    useAccountBridge: vi.fn(() => ({ featuresCheck: { isExpertAssistantFeatureEnabled: true } }))
}))

vi.mock('@/stores/context.js', () => ({
    useContextStore: vi.fn(() => ({ expert: {} }))
}))

vi.mock('@/stores/product-assistant.js', () => ({
    useProductAssistantStore: vi.fn(() => ({
        immersiveInstance: null,
        supportedActions: {}
    }))
}))

vi.mock('@/api/expert.js', () => ({
    default: { chat: vi.fn() }
}))

vi.mock('@/stores/product-expert-context.js', () => ({
    useProductExpertContextStore: vi.fn(() => ({
        shouldWakeUpAssistant: false,
        clearWakeUp: vi.fn()
    }))
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

// imported after mocks so vi.mock hoisting resolves correctly
const { useProductExpertStore } = await import('@/stores/product-expert.js')
const { useProductExpertInsightsAgentStore } = await import('@/stores/product-expert-insights-agent.js')
const { useProductExpertOperatorAgentStore } = await import('@/stores/product-expert-operator-agent.js')

describe('product-expert store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    describe('initial state', () => {
        it('defaults to INSIGHTS_AGENT mode', () => {
            const store = useProductExpertStore()
            expect(store.agentMode).toBe(INSIGHTS_AGENT)
        })

        it('has loadingVariant equal to INSIGHTS_AGENT', () => {
            const store = useProductExpertStore()
            expect(store.loadingVariant).toBe(INSIGHTS_AGENT)
        })

        it('has null abortController', () => {
            const store = useProductExpertStore()
            expect(store.abortController).toBeNull()
        })
    })

    describe('_agentStore getter', () => {
        it('returns insights-agent store when in INSIGHTS_AGENT mode', () => {
            const store = useProductExpertStore()
            const insightsAgent = useProductExpertInsightsAgentStore()
            expect(store.agentMode).toBe(INSIGHTS_AGENT)
            expect(store.messages).toBe(insightsAgent.messages)
        })

        it('returns operator-agent store when in OPERATOR_AGENT mode', () => {
            const store = useProductExpertStore()
            store.agentMode = OPERATOR_AGENT
            const operatorAgent = useProductExpertOperatorAgentStore()
            expect(store.messages).toBe(operatorAgent.messages)
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
            useProductExpertInsightsAgentStore().messages.push({ _type: 'human', content: 'hello' })
            expect(store.hasMessages).toBe(true)
        })
    })

    describe('isInsightsAgent / isOperatorAgent', () => {
        it('isInsightsAgent is true by default', () => {
            const store = useProductExpertStore()
            expect(store.isInsightsAgent).toBe(true)
            expect(store.isOperatorAgent).toBe(false)
        })

        it('isOperatorAgent is true when mode is OPERATOR_AGENT', () => {
            const store = useProductExpertStore()
            store.agentMode = OPERATOR_AGENT
            expect(store.isOperatorAgent).toBe(true)
            expect(store.isInsightsAgent).toBe(false)
        })
    })

    describe('setAgentMode', () => {
        it('sets a valid mode', () => {
            const store = useProductExpertStore()
            store.setAgentMode(OPERATOR_AGENT)
            expect(store.agentMode).toBe(OPERATOR_AGENT)
        })

        it('ignores an invalid mode', () => {
            const store = useProductExpertStore()
            store.setAgentMode('invalid-mode')
            expect(store.agentMode).toBe(INSIGHTS_AGENT)
        })
    })

    describe('setAbortController', () => {
        it('stores the controller on the active agent store', () => {
            const store = useProductExpertStore()
            const controller = new AbortController()
            store.setAbortController(controller)
            expect(useProductExpertInsightsAgentStore().abortController).toBe(controller)
        })

        it('clears the controller when passed null', () => {
            const store = useProductExpertStore()
            store.setAbortController(new AbortController())
            store.setAbortController(null)
            expect(useProductExpertInsightsAgentStore().abortController).toBeNull()
        })
    })

    describe('addUserMessage', () => {
        it('pushes a human message with correct format', () => {
            const store = useProductExpertStore()
            store.addUserMessage('hello')
            const messages = useProductExpertInsightsAgentStore().messages
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
            const messages = useProductExpertInsightsAgentStore().messages
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
            expect(useProductExpertInsightsAgentStore().messages[0].answer).toEqual([])
        })
    })

    describe('addPredefinedAiMessage', () => {
        it('pushes an ai message with a single-item answer array', () => {
            const store = useProductExpertStore()
            store.addPredefinedAiMessage('Generation stopped.')
            const messages = useProductExpertInsightsAgentStore().messages
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
            const messages = useProductExpertInsightsAgentStore().messages
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
            expect(useProductExpertInsightsAgentStore().messages).toHaveLength(0)
        })

        it('does not push when message is empty', () => {
            const store = useProductExpertStore()
            store.addSystemMessage({ message: '', type: 'warning' })
            expect(useProductExpertInsightsAgentStore().messages).toHaveLength(0)
        })
    })

    describe('updateMessageStreamedState', () => {
        it('marks a message as streamed by uuid', () => {
            const store = useProductExpertStore()
            store.addPredefinedAiMessage('hello')
            const msg = useProductExpertInsightsAgentStore().messages[0]
            expect(msg._streamed).toBe(false)
            store.updateMessageStreamedState(msg._uuid)
            expect(msg._streamed).toBe(true)
        })

        it('searches operator-agent messages if not found in insights-agent', () => {
            const store = useProductExpertStore()
            store.agentMode = OPERATOR_AGENT
            store.addPredefinedAiMessage('hello')
            const msg = useProductExpertOperatorAgentStore().messages[0]
            store.agentMode = INSIGHTS_AGENT // switch back, message is still in operator-agent
            store.updateMessageStreamedState(msg._uuid)
            expect(msg._streamed).toBe(true)
        })
    })

    describe('updateAnswerStreamedState', () => {
        it('marks a specific answer item as streamed', () => {
            const store = useProductExpertStore()
            store.addAiMessage({ answer: [{ kind: 'chat', content: 'hi' }] })
            const msg = useProductExpertInsightsAgentStore().messages[0]
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

    describe('reset', () => {
        it('calls reset on the active agent store and resets own state', () => {
            const store = useProductExpertStore()
            const insightsAgent = useProductExpertInsightsAgentStore()
            store.addUserMessage('hi')
            store.loadingVariant = 'transfer'

            store.reset()

            expect(insightsAgent.messages).toHaveLength(0)
            expect(store.loadingVariant).toBe(INSIGHTS_AGENT)
        })
    })
})
