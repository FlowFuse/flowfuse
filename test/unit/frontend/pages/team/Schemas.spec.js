import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

import TeamSchemas from '../../../../../frontend/src/pages/team/Schemas/index.vue'
import { useAccountSettingsStore } from '../../../../../frontend/src/stores/account-settings.js'

function mountPage (enabled) {
    const pinia = createTestingPinia({ createSpy: vi.fn })
    useAccountSettingsStore(pinia).featuresCheck = { isJsonSchemasFeatureEnabled: enabled }
    return mount(TeamSchemas, {
        global: {
            plugins: [pinia],
            stubs: { 'ff-page': { template: '<div data-el="schemas-page"><slot name="header" /></div>' }, 'ff-page-header': true }
        }
    })
}

describe('Team Schemas page', () => {
    test('shows the page when the feature is on', () => {
        expect(mountPage(true).find('[data-el="schemas-page"]').exists()).toBe(true)
    })

    test('shows nothing when the feature is off', () => {
        expect(mountPage(false).find('[data-el="schemas-page"]').exists()).toBe(false)
    })
})
