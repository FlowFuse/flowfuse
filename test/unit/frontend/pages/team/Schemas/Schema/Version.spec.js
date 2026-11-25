import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { reactive } from 'vue'

import SchemaVersion from '../../../../../../../frontend/src/pages/team/Schemas/Schema/Version.vue'
import Alerts from '../../../../../../../frontend/src/services/alerts.js'
import { useDataFarmSchemasStore } from '../../../../../../../frontend/src/stores/data-farm-schemas.ts'

const router = vi.hoisted(() => ({ replace: vi.fn() }))
const routeState = vi.hoisted(() => ({ route: null }))

vi.mock('vue-router', () => ({ useRouter: () => router, useRoute: () => routeState.route }))

vi.mock('../../../../../../../frontend/src/services/alerts.js', () => ({
    default: { emit: vi.fn() }
}))

const VERSION = { version: '1.1.0', status: 'published', schema: { type: 'object' }, notes: 'adds unit', publishedBy: { name: 'Alex' }, publishedAt: '2026-11-02T00:00:00Z' }
const apiError = (error) => Object.assign(new Error(error), { response: { data: { error } } })

function mountPage ({ schema = { id: 'abc' }, answer = async () => VERSION } = {}) {
    routeState.route = reactive({ params: { version: '1.1.0' } })
    const pinia = createTestingPinia({ createSpy: vi.fn })
    const schemas = useDataFarmSchemasStore(pinia)
    schemas.activeSchema = schema
    schemas.fetchVersion.mockImplementation(answer)
    const page = mount(SchemaVersion, {
        global: {
            plugins: [pinia],
            stubs: {
                'router-link': { props: ['to'], template: '<a :data-to="to.name"><slot /></a>' },
                StatusBadge: { props: ['text'], template: '<span>{{ text }}</span>' },
                JsonEditor: { props: ['modelValue', 'readOnly'], template: '<pre data-el="json-editor" :data-read-only="readOnly">{{ modelValue }}</pre>' }
            }
        }
    })
    return { page, schemas }
}

describe('Schema version page', () => {
    beforeEach(() => vi.clearAllMocks())

    test('shows the version read-only, with who published it, its notes and a way back to the list', async () => {
        const { page, schemas } = mountPage()
        await flushPromises()
        expect(schemas.fetchVersion).toHaveBeenCalledWith('1.1.0')
        expect(page.find('[data-el="version-number"]').text()).toBe('1.1.0')
        expect(page.find('[data-el="version-status"]').text()).toBe('Published')
        expect(page.find('[data-el="version-published"]').text()).toMatch(/^Published .* ago by Alex$/)
        expect(JSON.parse(page.find('[data-el="json-editor"]').text())).toEqual({ type: 'object' })
        expect(page.find('[data-el="json-editor"]').attributes('data-read-only')).toBe('true')
        expect(page.find('[data-el="version-notes"]').text()).toContain('adds unit')
        expect(page.find('[data-action="back-to-versions"]').attributes('data-to')).toBe('team-schema-versions')
    })

    test('says when the version is deprecated', async () => {
        const { page } = mountPage({ answer: async () => ({ ...VERSION, status: 'deprecated', notes: '' }) })
        await flushPromises()
        expect(page.find('[data-el="version-status"]').text()).toBe('Deprecated')
        expect(page.find('[data-el="version-notes"]').exists()).toBe(false)
    })

    test('waits for the schema before asking for the version', async () => {
        const { page, schemas } = mountPage({ schema: null })
        await flushPromises()
        expect(schemas.fetchVersion).not.toHaveBeenCalled()
        schemas.activeSchema = { id: 'abc' }
        await flushPromises()
        expect(schemas.fetchVersion).toHaveBeenCalledWith('1.1.0')
        expect(page.find('[data-el="schema-version"]').exists()).toBe(true)
    })

    test('loads the other version when the address changes to it', async () => {
        const { page, schemas } = mountPage({ answer: async (version) => ({ ...VERSION, version }) })
        await flushPromises()
        routeState.route.params.version = '1.0.0'
        await flushPromises()
        expect(schemas.fetchVersion).toHaveBeenLastCalledWith('1.0.0')
        expect(page.find('[data-el="version-number"]').text()).toBe('1.0.0')
    })

    test('goes back to the list, saying why, when there is no such version', async () => {
        const { page } = mountPage({ answer: async () => { throw apiError('Version 9.9.9 not found') } })
        await flushPromises()
        expect(Alerts.emit).toHaveBeenCalledWith('Version 9.9.9 not found', 'warning')
        expect(router.replace).toHaveBeenCalledWith({ name: 'team-schema-versions' })
        expect(page.find('[data-el="schema-version"]').exists()).toBe(false)
    })
})
