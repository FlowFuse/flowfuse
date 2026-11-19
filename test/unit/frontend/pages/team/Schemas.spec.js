import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Roles } from '../../../../../forge/lib/roles.js'
import TeamSchemas from '../../../../../frontend/src/pages/team/Schemas/index.vue'
import { useAccountSettingsStore } from '../../../../../frontend/src/stores/account-settings.js'
import { useContextStore } from '../../../../../frontend/src/stores/context.js'
import { useDataFarmSchemasStore } from '../../../../../frontend/src/stores/data-farm-schemas.ts'

const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('vue-router', () => ({
    useRouter: () => router
}))

function mountPage ({ enabled = true, role = Roles.Member } = {}) {
    const pinia = createTestingPinia({ createSpy: vi.fn })
    useAccountSettingsStore(pinia).featuresCheck = { isJsonSchemasFeatureEnabled: enabled }
    const context = useContextStore(pinia)
    context.team = { slug: 'team' }
    context.teamMembership = { role }
    const schemas = useDataFarmSchemasStore(pinia)
    const page = mount(TeamSchemas, {
        global: {
            plugins: [pinia],
            stubs: {
                'ff-page': { template: '<div data-el="schemas-page"><slot name="header" /><slot /></div>' },
                'ff-page-header': { template: '<div><slot name="tools" /></div>' },
                'ff-button': { template: '<button><slot /></button>' },
                'ff-dialog': { template: '<div><slot /><button data-action="confirm" @click="$emit(\'confirm\')" /></div>', methods: { show () {}, close () {} } },
                FormRow: {
                    props: ['modelValue', 'error'],
                    emits: ['update:modelValue'],
                    template: '<div><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"><span data-el="error">{{ error }}</span></div>'
                }
            }
        }
    })
    return { page, schemas }
}

async function submitName (page, name) {
    await page.find('[data-action="create-schema"]').trigger('click')
    await page.find('input').setValue(name)
    await page.find('[data-action="confirm"]').trigger('click')
    await flushPromises()
}

describe('Team Schemas page', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('shows the page when the feature is on', () => {
        expect(mountPage().page.find('[data-el="schemas-page"]').exists()).toBe(true)
    })

    test('shows nothing when the feature is off', () => {
        expect(mountPage({ enabled: false }).page.find('[data-el="schemas-page"]').exists()).toBe(false)
    })

    test('hides Create schema from a Viewer', () => {
        expect(mountPage({ role: Roles.Viewer }).page.find('[data-action="create-schema"]').exists()).toBe(false)
    })

    test('creates a schema with the trimmed name and opens it', async () => {
        const { page, schemas } = mountPage()
        schemas.createSchema.mockResolvedValue({ id: 'abc' })
        await submitName(page, '  Temp ')
        expect(schemas.createSchema).toHaveBeenCalledWith('Temp')
        expect(router.push).toHaveBeenCalledWith({ name: 'team-schema', params: { team_slug: 'team', schemaId: 'abc' } })
    })

    test('shows a name conflict on the field and stays put', async () => {
        const { page, schemas } = mountPage()
        schemas.createSchema.mockRejectedValue({ response: { data: { error: 'The name is already in use in this team' } } })
        await submitName(page, 'Temp')
        expect(page.find('[data-el="error"]').text()).toBe('The name is already in use in this team')
        expect(router.push).not.toHaveBeenCalled()
    })
})
