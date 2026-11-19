import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

import { Roles } from '../../../../../forge/lib/roles.js'
import TeamSchemas from '../../../../../frontend/src/pages/team/Schemas/index.vue'
import { useAccountSettingsStore } from '../../../../../frontend/src/stores/account-settings.js'
import { useContextStore } from '../../../../../frontend/src/stores/context.js'

const showDialog = vi.fn()

function mountPage ({ enabled = true, role = Roles.Member } = {}) {
    const pinia = createTestingPinia({ createSpy: vi.fn })
    useAccountSettingsStore(pinia).featuresCheck = { isJsonSchemasFeatureEnabled: enabled }
    useContextStore(pinia).teamMembership = { role }
    return mount(TeamSchemas, {
        global: {
            plugins: [pinia],
            stubs: {
                'ff-page': { template: '<div data-el="schemas-page"><slot name="header" /><slot /></div>' },
                'ff-page-header': { template: '<div><slot name="tools" /></div>' },
                'ff-button': { template: '<button><slot /></button>' },
                CreateSchemaDialog: { template: '<div />', methods: { show: showDialog } }
            }
        }
    })
}

describe('Team Schemas page', () => {
    test('shows the page when the feature is on', () => {
        expect(mountPage().find('[data-el="schemas-page"]').exists()).toBe(true)
    })

    test('shows nothing when the feature is off', () => {
        expect(mountPage({ enabled: false }).find('[data-el="schemas-page"]').exists()).toBe(false)
    })

    test('shows Create schema to a Member', () => {
        expect(mountPage().find('[data-action="create-schema"]').exists()).toBe(true)
    })

    test('hides Create schema from a Viewer', () => {
        expect(mountPage({ role: Roles.Viewer }).find('[data-action="create-schema"]').exists()).toBe(false)
    })

    test('opens the create dialog from the header button', async () => {
        await mountPage().find('[data-action="create-schema"]').trigger('click')
        expect(showDialog).toHaveBeenCalled()
    })
})
