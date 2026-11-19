import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@/composables/services/MqttExpertTopicHelper.ts', () => ({ default: {}, getEntityTopicPaths: () => ({}) }))

// imported after mocks so vi.mock hoisting resolves correctly
import { useProductExpertStore } from '../../../../frontend/src/stores/product-expert.js'

// The shape hydrateMessages consumes: `{ answer: [...] }` for AI turns,
// `{ query: '...' }` for the user's.
const MIXED_TRANSCRIPT = [
    { answer: [{ kind: 'questions', questions: [{ question: 'Where is the data coming from?', options: [] }] }] },
    { query: 'Where is the data coming from? Sensors' },
    { answer: [{ content: 'Great, noted.' }] },
    { query: 'What else do you need to know?' },
    { answer: [{ content: 'Nothing, we are done.' }] }
]

describe('product-expert hydrateMessages', () => {
    // Regression: the switch(true) dispatch matches with strict equality, so
    // a predicate returning a truthy string instead of a boolean silently
    // dropped every user message from rehydrated transcripts.
    test('hydrates ai and human messages in order', () => {
        setActivePinia(createPinia())
        const store = useProductExpertStore()
        store.hydrateMessages(MIXED_TRANSCRIPT)
        expect(store.messages.map(m => m._type)).toEqual(['ai', 'human', 'ai', 'human', 'ai'])
        expect(store.messages[1].content).toBe('Where is the data coming from? Sensors')
    })
})
