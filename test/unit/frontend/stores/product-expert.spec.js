import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FF_AGENT, OPERATOR_AGENT } from '@/stores/product-expert-agents.js'

vi.mock('@/stores/_account-bridge.js', () => ({
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

        it('has isGenerating false', () => {
            const store = useProductExpertStore()
            expect(store.isGenerating).toBe(false)
        })

        it('has autoScrollEnabled true', () => {
            const store = useProductExpertStore()
            expect(store.autoScrollEnabled).toBe(true)
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

    describe('messages getters', () => {
        it('hasMessages is false when agent store has no messages', () => {
            const store = useProductExpertStore()
            expect(store.hasMessages).toBe(false)
        })

        it('hasMessages is true when agent store has messages', () => {
            const store = useProductExpertStore()
            useProductExpertFfAgentStore().messages.push({ type: 'human', content: 'hello' })
            expect(store.hasMessages).toBe(true)
        })

        it('hasUserMessages is true when human message exists', () => {
            const store = useProductExpertStore()
            useProductExpertFfAgentStore().messages.push({ type: 'human', content: 'hi' })
            expect(store.hasUserMessages).toBe(true)
        })

        it('hasUserMessages is false when only ai messages exist', () => {
            const store = useProductExpertStore()
            useProductExpertFfAgentStore().messages.push({ type: 'ai', content: 'hello' })
            expect(store.hasUserMessages).toBe(false)
        })

        it('lastMessage returns the last message', () => {
            const store = useProductExpertStore()
            const msg1 = { type: 'human', content: 'hi' }
            const msg2 = { type: 'ai', content: 'hello' }
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
        it('stores the controller', () => {
            const store = useProductExpertStore()
            const controller = new AbortController()
            store.setAbortController(controller)
            expect(store.abortController).toBe(controller)
        })

        it('clears the controller when passed null', () => {
            const store = useProductExpertStore()
            store.setAbortController(new AbortController())
            store.setAbortController(null)
            expect(store.abortController).toBeNull()
        })
    })

    describe('setAutoScroll', () => {
        it('sets autoScrollEnabled', () => {
            const store = useProductExpertStore()
            store.setAutoScroll(false)
            expect(store.autoScrollEnabled).toBe(false)
            store.setAutoScroll(true)
            expect(store.autoScrollEnabled).toBe(true)
        })
    })

    describe('addMessage', () => {
        it('pushes a message to the active agent store', () => {
            const store = useProductExpertStore()
            store.addMessage({ type: 'ai', content: 'Hello' })
            expect(useProductExpertFfAgentStore().messages).toHaveLength(1)
            expect(useProductExpertFfAgentStore().messages[0].content).toBe('Hello')
        })
    })

    describe('updateLastMessage', () => {
        it('updates the content of the last message', () => {
            const store = useProductExpertStore()
            useProductExpertFfAgentStore().messages.push({ type: 'ai', content: 'old' })
            store.updateLastMessage('new content')
            expect(store.lastMessage.content).toBe('new content')
        })

        it('does nothing when there are no messages', () => {
            const store = useProductExpertStore()
            expect(() => store.updateLastMessage('anything')).not.toThrow()
        })
    })

    describe('clearConversation', () => {
        it('empties the messages array', () => {
            const store = useProductExpertStore()
            useProductExpertFfAgentStore().messages.push({ type: 'human', content: 'hi' })
            store.clearConversation()
            expect(store.messages).toHaveLength(0)
        })
    })

    describe('removeLoadingIndicator', () => {
        it('removes the loading message', () => {
            const store = useProductExpertStore()
            const ffAgent = useProductExpertFfAgentStore()
            ffAgent.messages.push({ type: 'human', content: 'hi' })
            ffAgent.messages.push({ type: 'loading' })
            store.removeLoadingIndicator()
            expect(store.messages).toHaveLength(1)
            expect(store.messages[0].type).toBe('human')
        })

        it('does nothing when no loading message exists', () => {
            const store = useProductExpertStore()
            useProductExpertFfAgentStore().messages.push({ type: 'human', content: 'hi' })
            expect(() => store.removeLoadingIndicator()).not.toThrow()
            expect(store.messages).toHaveLength(1)
        })
    })

    describe('reset', () => {
        it('calls reset on the active agent store and resets own state', () => {
            const store = useProductExpertStore()
            const ffAgent = useProductExpertFfAgentStore()
            ffAgent.messages.push({ type: 'human', content: 'hi' })
            store.isGenerating = true
            store.autoScrollEnabled = false

            store.reset()

            expect(ffAgent.messages).toHaveLength(0)
            expect(store.isGenerating).toBe(false)
            expect(store.autoScrollEnabled).toBe(true)
        })
    })
})
