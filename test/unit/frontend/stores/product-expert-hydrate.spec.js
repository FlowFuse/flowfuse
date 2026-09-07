import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@/composables/services/MqttExpertTopicHelper.ts', () => ({ default: {}, getEntityTopicPaths: () => ({}) }))

import { ONBOARDING_FIXTURE_MESSAGES } from '../../../../frontend/src/components/expert/composables/onboardingFixture.js'
import { useProductExpertStore } from '../../../../frontend/src/stores/product-expert.js'

describe('hydrate fixture', () => {
    test('hydrates ai and human messages', () => {
        setActivePinia(createPinia())
        const store = useProductExpertStore()
        store.hydrateMessages(ONBOARDING_FIXTURE_MESSAGES)
        expect(store.messages.map(m => m._type)).toEqual(['ai', 'human', 'ai', 'human', 'ai'])
    })
})
