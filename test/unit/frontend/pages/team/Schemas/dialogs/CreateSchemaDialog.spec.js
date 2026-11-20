import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import CreateSchemaDialog from '../../../../../../../frontend/src/pages/team/Schemas/dialogs/CreateSchemaDialog.vue'
import { useContextStore } from '../../../../../../../frontend/src/stores/context.js'
import { useDataFarmSchemasStore } from '../../../../../../../frontend/src/stores/data-farm-schemas.ts'

const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('vue-router', () => ({
    useRouter: () => router
}))

function mountDialog () {
    const pinia = createTestingPinia({ createSpy: vi.fn })
    useContextStore(pinia).team = { slug: 'team' }
    const schemas = useDataFarmSchemasStore(pinia)
    const dialog = mount(CreateSchemaDialog, {
        global: {
            plugins: [pinia],
            stubs: {
                'ff-dialog': { template: '<div><slot /><button data-action="confirm" @click="$emit(\'confirm\')" /></div>', methods: { show () {}, close () {} } },
                FormRow: {
                    props: ['modelValue', 'error'],
                    emits: ['update:modelValue'],
                    template: '<div><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"><span data-el="error">{{ error }}</span></div>'
                }
            }
        }
    })
    dialog.vm.show()
    return { dialog, schemas }
}

async function submitName (dialog, name) {
    await dialog.find('input').setValue(name)
    await dialog.find('[data-action="confirm"]').trigger('click')
    await flushPromises()
}

describe('Create schema dialog', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('creates a schema with the trimmed name and opens it', async () => {
        const { dialog, schemas } = mountDialog()
        schemas.createSchema.mockResolvedValue({ id: 'abc' })
        await submitName(dialog, '  Temp ')
        expect(schemas.createSchema).toHaveBeenCalledWith('Temp')
        expect(router.push).toHaveBeenCalledWith({ name: 'team-schema', params: { team_slug: 'team', schemaId: 'abc' } })
    })

    test('shows a name conflict on the field and stays put', async () => {
        const { dialog, schemas } = mountDialog()
        schemas.createSchema.mockRejectedValue({ response: { data: { error: 'The name is already in use in this team' } } })
        await submitName(dialog, 'Temp')
        expect(dialog.find('[data-el="error"]').text()).toBe('The name is already in use in this team')
        expect(router.push).not.toHaveBeenCalled()
    })

    test('ignores a second confirm while the schema is being created', async () => {
        const { dialog, schemas } = mountDialog()
        schemas.createSchema.mockReturnValue(new Promise(() => {}))
        await dialog.find('input').setValue('Temp')
        await dialog.find('[data-action="confirm"]').trigger('click')
        await dialog.find('[data-action="confirm"]').trigger('click')
        expect(schemas.createSchema).toHaveBeenCalledTimes(1)
    })

    test('clears the name and error when reopened', async () => {
        const { dialog, schemas } = mountDialog()
        schemas.createSchema.mockRejectedValue({ response: { data: { error: 'The name is already in use in this team' } } })
        await submitName(dialog, 'Temp')
        dialog.vm.show()
        await dialog.vm.$nextTick()
        expect(dialog.find('input').element.value).toBe('')
        expect(dialog.find('[data-el="error"]').text()).toBe('')
    })
})
