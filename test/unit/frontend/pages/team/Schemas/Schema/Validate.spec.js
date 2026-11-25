import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { reactive } from 'vue'

import SchemaValidate from '../../../../../../../frontend/src/pages/team/Schemas/Schema/Validate.vue'
import { useDataFarmSchemasStore } from '../../../../../../../frontend/src/stores/data-farm-schemas.ts'

const router = vi.hoisted(() => ({ replace: vi.fn() }))
const route = vi.hoisted(() => ({ query: {} }))

vi.mock('vue-router', () => ({ useRouter: () => router, useRoute: () => route }))
// the check runs as soon as the message changes, rather than after a pause in typing
vi.mock('../../../../../../../frontend/src/utils/eventHandling', () => ({ debounce: (fn) => fn }))

const DRAFT_DOC = { type: 'object', required: ['value'], properties: { value: { type: 'number' } } }
const PUBLISHED_DOC = { type: 'object', properties: { value: { type: 'string' } } }

function mountPage ({ query = {}, draft = true, published = true } = {}) {
    route.query = reactive(query)
    const pinia = createTestingPinia({ createSpy: vi.fn })
    const schemas = useDataFarmSchemasStore(pinia)
    schemas.activeSchema = { id: 'abc', name: 'Temperature', group: null, hasDraft: draft, versions: [...(draft ? [{ version: null, status: 'draft' }] : []), ...(published ? [{ version: '1.1.0', status: 'published' }, { version: '1.0.0', status: 'deprecated' }] : [])] }
    schemas.activeDraft = draft ? { status: 'draft', schema: DRAFT_DOC, notes: '' } : null
    schemas.activeLatestPublished = published ? { version: '1.1.0', status: 'published', schema: PUBLISHED_DOC } : null
    schemas.fetchVersion.mockResolvedValue({ version: '1.0.0', status: 'deprecated', schema: { type: 'object' } })
    schemas.validateMessage.mockResolvedValue({ valid: true, errors: [] })
    const page = mount(SchemaValidate, {
        global: {
            plugins: [pinia],
            stubs: {
                'ff-data-table': { template: '<table><tbody><slot name="rows" /></tbody></table>' },
                'ff-data-table-row': { template: '<tr><slot /></tr>' },
                'ff-data-table-cell': { template: '<td><slot /></td>' },
                'ff-button': { props: ['to', 'disabled'], template: '<button :disabled="disabled"><slot /></button>' },
                ToggleButtonGroup: { props: ['modelValue', 'buttons'], emits: ['update:modelValue'], template: '<div data-el="toggle" :data-value="modelValue"><button v-for="b in buttons" :key="b.value" :data-target="b.value" @click="$emit(\'update:modelValue\', b.value)">{{ b.title }}</button></div>' }
            }
        }
    })
    return { page, schemas }
}

const typePayload = async (page, text) => {
    await page.find('[data-el="validate-payload"]').setValue(text)
    await flushPromises()
}
const banner = (page) => page.find('[data-el="validate-banner"]')

describe('Validate a message page', () => {
    beforeEach(() => vi.clearAllMocks())

    test('checks against the draft by default, offering the latest published version too', () => {
        const { page } = mountPage()
        expect(page.find('[data-el="validate-against"]').attributes('data-value')).toBe('draft')
        expect(page.findAll('[data-target]').map(button => button.text())).toEqual(['Draft', 'Published 1.1.0'])
        expect(page.find('[data-el="validate-hint"]').text()).toMatch(/^Paste a message/)
    })

    test('checks against the latest published version when there is no draft', () => {
        const { page } = mountPage({ draft: false })
        expect(page.find('[data-el="validate-against"]').attributes('data-value')).toBe('1.1.0')
    })

    test('checks against an older version when one is asked for', async () => {
        const { page, schemas } = mountPage({ query: { against: '1.0.0' } })
        await flushPromises()
        expect(page.findAll('[data-target]').map(button => button.text())).toEqual(['Draft', 'Published 1.1.0', '1.0.0'])
        expect(schemas.fetchVersion).toHaveBeenCalledWith('1.0.0')
        await typePayload(page, '{}')
        expect(schemas.validateMessage).toHaveBeenCalledWith('1.0.0', {})
    })

    test('shows each field\'s result and a banner with the problem count', async () => {
        const { page, schemas } = mountPage()
        schemas.validateMessage.mockResolvedValue({ valid: false, errors: [{ path: '/value', keyword: 'required', message: 'must have required property \'value\'', params: {} }] })
        await typePayload(page, '{"extra": 1}')
        expect(schemas.validateMessage).toHaveBeenCalledWith('draft', { extra: 1 })
        expect(banner(page).text()).toBe('Fails · 1 problem')
        expect(page.find('[data-el="validate-row-/value"]').attributes('data-result')).toBe('fail')
        expect(page.find('[data-el="validate-row-/extra"]').attributes('data-result')).toBe('extra')
    })

    test('says the message passes', async () => {
        const { page } = mountPage()
        await typePayload(page, '{"value": 1}')
        expect(banner(page).text()).toBe('Passes')
    })

    test('shows why the message is not JSON instead of checking it', async () => {
        const { page, schemas } = mountPage()
        await typePayload(page, '{"value": 1')
        expect(banner(page).text()).toMatch(/^The message is not valid JSON/)
        expect(schemas.validateMessage).not.toHaveBeenCalled()
    })

    test('says why the message could not be checked', async () => {
        const { page, schemas } = mountPage()
        schemas.validateMessage.mockRejectedValue(Object.assign(new Error('x'), { response: { data: { error: 'The schema has problems and cannot be used for validation' } } }))
        await typePayload(page, '{}')
        expect(banner(page).text()).toBe('The schema has problems and cannot be used for validation')
    })

    test('puts the picked version in the address', async () => {
        const { page } = mountPage()
        await page.find('[data-target="1.1.0"]').trigger('click')
        expect(router.replace).toHaveBeenCalledWith({ query: { against: '1.1.0' } })
    })

    test('fills in an example message for the version checked against, and clears it', async () => {
        const { page, schemas } = mountPage()
        await page.find('[data-action="example-from-schema"]').trigger('click')
        await flushPromises()
        expect(JSON.parse(page.find('[data-el="validate-payload"]').element.value)).toEqual({ value: 0 })
        expect(schemas.validateMessage).toHaveBeenLastCalledWith('draft', { value: 0 })
        await page.find('[data-action="clear-payload"]').trigger('click')
        expect(page.find('[data-el="validate-payload"]').element.value).toBe('')
    })

    test('says so when there is nothing to check against yet', () => {
        const { page } = mountPage({ draft: false, published: false })
        expect(page.find('[data-el="validate-unavailable"]').exists()).toBe(true)
    })
})
