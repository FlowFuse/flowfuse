import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FF_AGENT, OPERATOR_AGENT } from '@/stores/product-expert-agents.js'

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
const { useProductExpertFfAgentStore } = await import('@/stores/product-expert-ff-agent.js')
const { useProductExpertOperatorAgentStore } = await import('@/stores/product-expert-operator-agent.js')

describe('product-expert store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    describe('initial state', () => {
        it('defaults to FF_AGENT mode', () => {
            const store = useProductExpertStore()
            expect(store.agentMode).toBe(FF_AGENT)
        })

        it('has loadingVariant equal to FF_AGENT', () => {
            const store = useProductExpertStore()
            expect(store.loadingVariant).toBe(FF_AGENT)
        })

        it('has null abortController', () => {
            const store = useProductExpertStore()
            expect(store.abortController).toBeNull()
        })

        it('has shouldWakeUpAssistant false', () => {
            const store = useProductExpertStore()
            expect(store.shouldWakeUpAssistant).toBe(false)
        })
    })

    describe('_agentStore getter', () => {
        it('returns ff-agent store when in FF_AGENT mode', () => {
            const store = useProductExpertStore()
            const ffAgent = useProductExpertFfAgentStore()
            expect(store.agentMode).toBe(FF_AGENT)
            expect(store.messages).toBe(ffAgent.messages)
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
            useProductExpertFfAgentStore().messages.push({ _type: 'human', content: 'hello' })
            expect(store.hasMessages).toBe(true)
        })

        it('hasUserMessages is true when human message exists', () => {
            const store = useProductExpertStore()
            useProductExpertFfAgentStore().messages.push({ _type: 'human', content: 'hi' })
            expect(store.hasUserMessages).toBe(true)
        })

        it('hasUserMessages is false when only ai messages exist', () => {
            const store = useProductExpertStore()
            useProductExpertFfAgentStore().messages.push({ _type: 'ai', content: 'hello' })
            expect(store.hasUserMessages).toBe(false)
        })

        it('lastMessage returns the last message', () => {
            const store = useProductExpertStore()
            const msg1 = { _type: 'human', content: 'hi' }
            const msg2 = { _type: 'ai', content: 'hello' }
            useProductExpertFfAgentStore().messages.push(msg1, msg2)
            expect(store.lastMessage).toEqual(msg2)
        })

        it('lastMessage returns null when no messages', () => {
            const store = useProductExpertStore()
            expect(store.lastMessage).toBeNull()
        })
    })

    describe('isFfAgent / isOperatorAgent', () => {
        it('isFfAgent is true by default', () => {
            const store = useProductExpertStore()
            expect(store.isFfAgent).toBe(true)
            expect(store.isOperatorAgent).toBe(false)
        })

        it('isOperatorAgent is true when mode is OPERATOR_AGENT', () => {
            const store = useProductExpertStore()
            store.agentMode = OPERATOR_AGENT
            expect(store.isOperatorAgent).toBe(true)
            expect(store.isFfAgent).toBe(false)
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
            expect(store.agentMode).toBe(FF_AGENT)
        })
    })

    describe('setAbortController', () => {
        it('stores the controller on the active agent store', () => {
            const store = useProductExpertStore()
            const controller = new AbortController()
            store.setAbortController(controller)
            expect(useProductExpertFfAgentStore().abortController).toBe(controller)
        })

        it('clears the controller when passed null', () => {
            const store = useProductExpertStore()
            store.setAbortController(new AbortController())
            store.setAbortController(null)
            expect(useProductExpertFfAgentStore().abortController).toBeNull()
        })
    })

    describe('addUserMessage', () => {
        it('pushes a human message with correct format', () => {
            const store = useProductExpertStore()
            store.addUserMessage('hello')
            const messages = useProductExpertFfAgentStore().messages
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
            const messages = useProductExpertFfAgentStore().messages
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
            expect(useProductExpertFfAgentStore().messages[0].answer).toEqual([])
        })
    })

    describe('addPredefinedAiMessage', () => {
        it('pushes an ai message with a single-item answer array', () => {
            const store = useProductExpertStore()
            store.addPredefinedAiMessage('Generation stopped.')
            const messages = useProductExpertFfAgentStore().messages
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
            const messages = useProductExpertFfAgentStore().messages
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
            expect(useProductExpertFfAgentStore().messages).toHaveLength(0)
        })

        it('does not push when message is empty', () => {
            const store = useProductExpertStore()
            store.addSystemMessage({ message: '', type: 'warning' })
            expect(useProductExpertFfAgentStore().messages).toHaveLength(0)
        })
    })

    describe('updateMessageStreamedState', () => {
        it('marks a message as streamed by uuid', () => {
            const store = useProductExpertStore()
            store.addPredefinedAiMessage('hello')
            const msg = useProductExpertFfAgentStore().messages[0]
            expect(msg._streamed).toBe(false)
            store.updateMessageStreamedState(msg._uuid)
            expect(msg._streamed).toBe(true)
        })

        it('searches operator-agent messages if not found in ff-agent', () => {
            const store = useProductExpertStore()
            store.agentMode = OPERATOR_AGENT
            store.addPredefinedAiMessage('hello')
            const msg = useProductExpertOperatorAgentStore().messages[0]
            store.agentMode = FF_AGENT // switch back, message is still in operator-agent
            store.updateMessageStreamedState(msg._uuid)
            expect(msg._streamed).toBe(true)
        })
    })

    describe('updateAnswerStreamedState', () => {
        it('marks a specific answer item as streamed', () => {
            const store = useProductExpertStore()
            store.addAiMessage({ answer: [{ kind: 'chat', content: 'hi' }] })
            const msg = useProductExpertFfAgentStore().messages[0]
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
            const ffAgent = useProductExpertFfAgentStore()
            store.addUserMessage('hi')
            store.loadingVariant = 'transfer'

            store.reset()

            expect(ffAgent.messages).toHaveLength(0)
            expect(store.loadingVariant).toBe(FF_AGENT)
        })
    })
})
