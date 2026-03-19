import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/stores/_account_bridge.js', () => ({
    useAccountBridge: vi.fn(() => ({ featuresCheck: { isExpertAssistantFeatureEnabled: true } }))
}))

const mockFfAgentStore = { context: null, sessionId: null }

vi.mock('@/stores/product-expert-ff-agent.js', () => ({
    useProductExpertFfAgentStore: vi.fn(() => mockFfAgentStore)
}))

// imported after mocks so vi.mock hoisting resolves correctly
const { useProductExpertContextStore } = await import('@/stores/product-expert-context.js')
const { useAccountBridge } = await import('@/stores/_account_bridge.js')

describe('product-expert-context store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        mockFfAgentStore.context = null
        mockFfAgentStore.sessionId = null
        useAccountBridge.mockReturnValue({ featuresCheck: { isExpertAssistantFeatureEnabled: true } })
    })

    describe('initial state', () => {
        it('has shouldWakeUpAssistant false', () => {
            const store = useProductExpertContextStore()
            expect(store.shouldWakeUpAssistant).toBe(false)
        })
    })

    describe('setContext', () => {
        it('sets context and sessionId on the ff-agent store', () => {
            const store = useProductExpertContextStore()
            store.setContext({ data: { history: [] }, sessionId: 'abc' })
            expect(mockFfAgentStore.context).toEqual({ history: [] })
            expect(mockFfAgentStore.sessionId).toBe('abc')
        })

        it('sets shouldWakeUpAssistant to true', () => {
            const store = useProductExpertContextStore()
            store.setContext({ data: {}, sessionId: null })
            expect(store.shouldWakeUpAssistant).toBe(true)
        })

        it('does not set sessionId when not provided', () => {
            const store = useProductExpertContextStore()
            store.setContext({ data: {} })
            expect(mockFfAgentStore.sessionId).toBeNull()
        })

        it('does nothing when feature is disabled', () => {
            useAccountBridge.mockReturnValue({ featuresCheck: { isExpertAssistantFeatureEnabled: false } })
            const store = useProductExpertContextStore()
            store.setContext({ data: { history: [] }, sessionId: 'abc' })
            expect(store.shouldWakeUpAssistant).toBe(false)
        })
    })

    describe('clearWakeUp', () => {
        it('sets shouldWakeUpAssistant back to false', () => {
            const store = useProductExpertContextStore()
            store.setContext({ data: {} })
            expect(store.shouldWakeUpAssistant).toBe(true)
            store.clearWakeUp()
            expect(store.shouldWakeUpAssistant).toBe(false)
        })
    })
})
