import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { reactive } from 'vue'

import SchemaCompare from '../../../../../../../frontend/src/pages/team/Schemas/Schema/Compare.vue'
import Alerts from '../../../../../../../frontend/src/services/alerts.js'
import { useDataFarmSchemasStore } from '../../../../../../../frontend/src/stores/data-farm-schemas.ts'

const router = vi.hoisted(() => ({ replace: vi.fn() }))
const route = vi.hoisted(() => ({ query: {} }))

vi.mock('vue-router', () => ({ useRouter: () => router, useRoute: () => route }))

vi.mock('../../../../../../../frontend/src/services/alerts.js', () => ({
    default: { emit: vi.fn() }
}))

const VERSIONS = [{ version: null, status: 'draft' }, { version: '1.1.0', status: 'published' }, { version: '1.0.0', status: 'deprecated' }]
const CHANGES = [
    { path: '/properties/unit/description', type: 'changed', detail: { from: 'SenML unit', to: 'SenML unit name' } },
    { path: '/properties/alarm', type: 'added', detail: { to: { type: 'boolean' } } },
    { path: '/properties/serial', type: 'deleted', detail: { from: { type: 'string' } } }
]

function mountCompare ({ query = {}, versions = VERSIONS, comparison = { changes: CHANGES, from: { $id: 'a', type: 'object' }, to: { $id: 'b', type: 'array' } } } = {}) {
    route.query = reactive(query)
    const pinia = createTestingPinia({ createSpy: vi.fn })
    const schemas = useDataFarmSchemasStore(pinia)
    schemas.activeSchema = { id: 'abc', name: 'Temperature', group: null, versions }
    if (comparison instanceof Error) schemas.fetchComparison.mockRejectedValue(comparison)
    else schemas.fetchComparison.mockResolvedValue(comparison)
    const page = mount(SchemaCompare, {
        global: {
            plugins: [pinia],
            stubs: {
                'ff-data-table': { template: '<table><tbody><slot name="rows" /></tbody></table>' },
                'ff-data-table-row': { template: '<tr data-el="schema-change"><slot /></tr>' },
                'ff-data-table-cell': { template: '<td><slot /></td>' },
                'ff-listbox': { props: ['modelValue', 'options'], emits: ['update:modelValue'], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>' },
                'ff-loading': { template: '<div data-el="loading" />' },
                SnapshotDiffChangePanel: { props: ['value1', 'value2'], template: '<pre data-el="json-diff">{{ value1 }}|{{ value2 }}</pre>' },
                DiffTypeBadge: { props: ['type'], template: '<b>{{ type }}</b>' },
                DiffValuePill: { props: ['kind', 'text'], template: '<i :data-kind="kind">{{ text }}</i>' }
            }
        }
    })
    return { page, schemas }
}

const rows = (page) => page.findAll('[data-el="schema-change"]').map(row => row.text())

describe('Schema compare page', () => {
    beforeEach(() => vi.clearAllMocks())

    test('compares the version it was opened from with the draft, listing each change', async () => {
        const { page, schemas } = mountCompare({ query: { from: '1.0.0' } })
        expect(page.find('[data-el="loading"]').exists()).toBe(true)
        await flushPromises()
        expect(schemas.fetchComparison).toHaveBeenCalledWith('1.0.0', 'draft')
        expect(page.find('[data-el="schema-compare-summary"]').text()).toBe('3 changes from 1.0.0 to the last saved draft')
        expect(rows(page)).toEqual([
            '/unit/descriptionchangedSenML unit→SenML unit name',
            '/alarmadded{"type":"boolean"}',
            '/serialdeleted{"type":"string"}'
        ])
        expect(page.find('[data-el="schema-change"] i').attributes('data-kind')).toBe('removed')
    })

    test('shows both documents in the JSON diff without their version ids', async () => {
        const { page } = mountCompare()
        await flushPromises()
        const [from, to] = page.find('[data-el="json-diff"]').text().split('|')
        expect([JSON.parse(from), JSON.parse(to)]).toEqual([{ type: 'object' }, { type: 'array' }])
    })

    test('puts a picked version in the address, keeping the other', async () => {
        const { page } = mountCompare({ query: { from: '1.0.0' } })
        await flushPromises()
        await page.find('[data-el="compare-to"]').setValue('1.1.0')
        expect(router.replace).toHaveBeenCalledWith({ query: { from: '1.0.0', to: '1.1.0' } })
    })

    test('compares again when the versions in the address change', async () => {
        const { schemas } = mountCompare({ query: { from: '1.0.0' } })
        await flushPromises()
        route.query.to = '1.1.0'
        await flushPromises()
        expect(schemas.fetchComparison).toHaveBeenLastCalledWith('1.0.0', '1.1.0')
    })

    test('says so when the two versions are the same', async () => {
        const { page } = mountCompare({ comparison: { changes: [], from: {}, to: {} } })
        await flushPromises()
        expect(page.find('[data-el="schema-compare-same"]').exists()).toBe(true)
        expect(page.find('[data-el="schema-compare-summary"]').text()).toBe('0 changes from 1.1.0 to the last saved draft')
    })

    test('needs two versions to compare', () => {
        const { page, schemas } = mountCompare({ versions: [{ version: '1.0.0', status: 'published' }] })
        expect(page.find('[data-el="schema-compare-unavailable"]').exists()).toBe(true)
        expect(schemas.fetchComparison).not.toHaveBeenCalled()
    })

    test('says why when the versions could not be compared', async () => {
        mountCompare({ comparison: Object.assign(new Error('x'), { response: { data: { error: 'Version 9.9.9 not found' } } }) })
        await flushPromises()
        expect(Alerts.emit).toHaveBeenCalledWith('Version 9.9.9 not found', 'warning')
    })

    test('shows an error instead of the spinner when the comparison failed', async () => {
        const { page } = mountCompare({ comparison: new Error('x') })
        await flushPromises()
        expect(page.find('[data-el="schema-compare-failed"]').exists()).toBe(true)
        expect(page.find('[data-el="loading"]').exists()).toBe(false)
    })

    test('offers the draft as the version compared to only', async () => {
        const { page } = mountCompare()
        await flushPromises()
        const values = (el) => page.find(`[data-el="${el}"]`).findAll('option').map(option => option.element.value)
        expect(values('compare-from')).toEqual(['1.1.0', '1.0.0'])
        expect(values('compare-to')).toEqual(['draft', '1.1.0', '1.0.0'])
    })

    test('takes the first of a version repeated in the address', async () => {
        const { schemas } = mountCompare({ query: { from: ['1.0.0', '1.1.0'], to: ['1.1.0', 'draft'] } })
        await flushPromises()
        expect(schemas.fetchComparison).toHaveBeenCalledWith('1.0.0', '1.1.0')
    })

    test('compares a version with itself when both sides were picked', async () => {
        const { schemas } = mountCompare({ query: { from: '1.0.0', to: '1.0.0' } })
        await flushPromises()
        expect(schemas.fetchComparison).toHaveBeenCalledWith('1.0.0', '1.0.0')
    })

    test('labels both listboxes', () => {
        const { page } = mountCompare()
        expect(page.findComponent('[data-el="compare-from"]').attributes('aria-label')).toBe('From version')
        expect(page.findComponent('[data-el="compare-to"]').attributes('aria-label')).toBe('To version')
    })
})
