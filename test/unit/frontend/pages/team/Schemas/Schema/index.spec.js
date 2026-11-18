import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

import { Roles } from '../../../../../../../forge/lib/roles.js'
import TeamSchema from '../../../../../../../frontend/src/pages/team/Schemas/Schema/index.vue'
import { useAccountSettingsStore } from '../../../../../../../frontend/src/stores/account-settings.js'
import { useContextStore } from '../../../../../../../frontend/src/stores/context.js'
import { useDataFarmSchemasStore } from '../../../../../../../frontend/src/stores/data-farm-schemas.ts'

vi.mock('vue-router', () => ({
    useRoute: () => ({ params: { team_slug: 'team', schemaId: 'abc' } })
}))

const DRAFT = { schema: { type: 'object' }, notes: null }
const PUBLISHED = { version: '1.2.0', status: 'published', notes: null, publishedAt: '2026-11-01T00:00:00Z', publishedBy: null }

function mountPage (role, { draft = null, latestPublished = null } = {}) {
    const pinia = createTestingPinia({ createSpy: vi.fn })
    useAccountSettingsStore(pinia).featuresCheck = { isJsonSchemasFeatureEnabled: true }
    const context = useContextStore(pinia)
    context.team = { slug: 'team' }
    context.teamMembership = { role }
    const schemas = useDataFarmSchemasStore(pinia)
    schemas.activeSchema = { id: 'abc', name: 'Temperature', group: null }
    schemas.activeDraft = draft
    schemas.activeLatestPublished = latestPublished
    return mount(TeamSchema, {
        global: {
            plugins: [pinia],
            stubs: {
                'ff-page': { template: '<div><slot name="header" /><slot /></div>' },
                'ff-page-header': { template: '<div><slot name="status" /><slot name="context" /><slot name="tools" /></div>' },
                'ff-button': { template: '<button><slot /></button>' },
                'router-view': true,
                PublishSchemaDialog: true,
                StatusBadge: { props: ['text'], template: '<span data-el="schema-status">{{ text }}</span>' }
            }
        }
    })
}

describe('Team Schema page', () => {
    test('shows the draft badge and draft actions to a Member', () => {
        const page = mountPage(Roles.Member, { draft: DRAFT })
        expect(page.find('[data-el="schema-status"]').text()).toBe('Draft')
        expect(page.find('[data-action="discard-draft"]').exists()).toBe(true)
        expect(page.find('[data-action="save-draft"]').exists()).toBe(true)
        expect(page.find('[data-action="publish"]').exists()).toBe(true)
    })

    test('hides draft actions from a Viewer', () => {
        const page = mountPage(Roles.Viewer, { draft: DRAFT })
        expect(page.find('[data-action="discard-draft"]').exists()).toBe(false)
        expect(page.find('[data-action="save-draft"]').exists()).toBe(false)
        expect(page.find('[data-action="publish"]').exists()).toBe(false)
        expect(page.find('[data-action="create-draft"]').exists()).toBe(false)
    })

    test('shows the latest published version read-only with a create draft action', () => {
        const page = mountPage(Roles.Member, { latestPublished: PUBLISHED })
        expect(page.find('[data-el="schema-status"]').text()).toBe('Published 1.2.0')
        expect(page.find('[data-action="publish"]').exists()).toBe(false)
        expect(page.find('[data-action="create-draft"]').text()).toBe('Create draft from 1.2.0')
    })
})
