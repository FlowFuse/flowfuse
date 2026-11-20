import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Roles } from '../../../../../../../forge/lib/roles.js'
import TeamSchema from '../../../../../../../frontend/src/pages/team/Schemas/Schema/index.vue'
import Alerts from '../../../../../../../frontend/src/services/alerts.js'
import { useAccountSettingsStore } from '../../../../../../../frontend/src/stores/account-settings.js'
import { useContextStore } from '../../../../../../../frontend/src/stores/context.js'
import { useDataFarmSchemasStore } from '../../../../../../../frontend/src/stores/data-farm-schemas.ts'

const router = vi.hoisted(() => ({ push: vi.fn() }))
const dialog = vi.hoisted(() => ({ setError: vi.fn(), close: vi.fn() }))

vi.mock('vue-router', () => ({
    useRoute: () => ({ params: { team_slug: 'team', schemaId: 'abc' } }),
    useRouter: () => router
}))

vi.mock('../../../../../../../frontend/src/services/alerts.js', () => ({
    default: { emit: vi.fn() }
}))

const DRAFT = { status: 'draft', schema: { type: 'object' }, notes: '', problems: [] }
const PUBLISHED = { version: '1.2.0', status: 'published', schema: { type: 'object' }, notes: '', publishedAt: '2026-11-01T00:00:00Z', publishedBy: null }
const apiError = (error) => Object.assign(new Error(error), { response: { data: { error } } })

function mountPage (role, { draft = null, latestPublished = null, loadError = null } = {}) {
    const pinia = createTestingPinia({ createSpy: vi.fn })
    useAccountSettingsStore(pinia).featuresCheck = { isJsonSchemasFeatureEnabled: true }
    const context = useContextStore(pinia)
    context.team = { slug: 'team' }
    context.teamMembership = { role }
    const schemas = useDataFarmSchemasStore(pinia)
    schemas.activeSchema = { id: 'abc', name: 'Temperature', group: null }
    schemas.activeDraft = draft
    schemas.activeLatestPublished = latestPublished
    if (loadError) schemas.loadActiveSchema.mockRejectedValue(loadError)
    const page = mount(TeamSchema, {
        global: {
            plugins: [pinia],
            stubs: {
                'ff-page': { template: '<div><slot name="header" /><slot /></div>' },
                'ff-page-header': { template: '<div><slot name="status" /><slot name="context" /><slot name="tools" /></div>' },
                'ff-button': { template: '<button><slot /></button>' },
                'router-view': true,
                PublishSchemaDialog: { name: 'PublishSchemaDialog', template: '<div />', methods: { show () {}, close: dialog.close, setError: dialog.setError } },
                StatusBadge: { props: ['text'], template: '<span data-el="schema-status">{{ text }}</span>' }
            }
        }
    })
    return { page, schemas }
}

const publishFrom = (page) => page.findComponent({ name: 'PublishSchemaDialog' }).vm.$emit('publish', { version: '1.3.0', notes: '' })

describe('Team Schema page', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('shows the draft badge and draft actions to a Member', () => {
        const { page } = mountPage(Roles.Member, { draft: DRAFT })
        expect(page.find('[data-el="schema-status"]').text()).toBe('Draft')
        expect(page.find('[data-action="discard-draft"]').exists()).toBe(true)
        expect(page.find('[data-action="save-draft"]').exists()).toBe(true)
        expect(page.find('[data-action="publish"]').exists()).toBe(true)
    })

    test('hides draft actions from a Viewer', () => {
        const { page } = mountPage(Roles.Viewer, { draft: DRAFT })
        expect(page.find('[data-action="discard-draft"]').exists()).toBe(false)
        expect(page.find('[data-action="save-draft"]').exists()).toBe(false)
        expect(page.find('[data-action="publish"]').exists()).toBe(false)
        expect(page.find('[data-action="create-draft"]').exists()).toBe(false)
    })

    test('shows the latest published version read-only with a create draft action', () => {
        const { page } = mountPage(Roles.Member, { latestPublished: PUBLISHED })
        expect(page.find('[data-el="schema-status"]').text()).toBe('Published 1.2.0')
        expect(page.find('[data-action="publish"]').exists()).toBe(false)
        expect(page.find('[data-action="create-draft"]').text()).toBe('Create draft from 1.2.0')
    })

    test('shows a deprecated latest version', () => {
        const { page } = mountPage(Roles.Member, { latestPublished: { ...PUBLISHED, status: 'deprecated' } })
        expect(page.find('[data-el="schema-status"]').text()).toBe('Deprecated 1.2.0')
    })

    test('goes back to the schema list when the schema fails to load', async () => {
        mountPage(Roles.Member, { loadError: apiError('Not Found') })
        await flushPromises()
        expect(Alerts.emit).toHaveBeenCalledWith('Not Found', 'warning')
        expect(router.push).toHaveBeenCalledWith({ name: 'team-schemas', params: { team_slug: 'team' } })
    })

    test('shows a publish error in the dialog while the draft still exists', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.publishDraft.mockRejectedValue(apiError('Version 1.3.0 already exists'))
        publishFrom(page)
        await flushPromises()
        expect(dialog.setError).toHaveBeenCalledWith('Version 1.3.0 already exists')
        expect(dialog.close).not.toHaveBeenCalled()
    })

    test('ignores a second publish while one is running', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.publishDraft.mockReturnValue(new Promise(() => {}))
        publishFrom(page)
        publishFrom(page)
        await flushPromises()
        expect(schemas.publishDraft).toHaveBeenCalledTimes(1)
    })

    test('closes the dialog when the draft was published or discarded elsewhere', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.publishDraft.mockImplementation(async () => {
            schemas.activeDraft = null
            throw apiError('The draft was published or discarded by another request')
        })
        publishFrom(page)
        await flushPromises()
        expect(dialog.close).toHaveBeenCalled()
        expect(Alerts.emit).toHaveBeenCalledWith('The draft was published or discarded by another request', 'warning')
        expect(dialog.setError).not.toHaveBeenCalled()
    })
})
