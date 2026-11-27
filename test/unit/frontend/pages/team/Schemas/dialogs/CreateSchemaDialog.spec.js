import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, test } from 'vitest'

import CreateSchemaDialog from '../../../../../../../frontend/src/pages/team/Schemas/dialogs/CreateSchemaDialog.vue'
import { useUxDialogStore } from '../../../../../../../frontend/src/stores/ux-dialog.js'

function mountDialog (props = {}) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const dialog = mount(CreateSchemaDialog, {
        props: { error: '', creating: false, ...props },
        global: {
            plugins: [pinia],
            stubs: {
                FormRow: {
                    props: ['modelValue', 'error'],
                    emits: ['update:modelValue'],
                    template: '<div><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"><span data-el="error">{{ error }}</span></div>'
                }
            }
        }
    })
    return { dialog, dialogStore: useUxDialogStore(pinia) }
}

describe('Create schema dialog', () => {
    test('reports the trimmed name', async () => {
        const { dialog } = mountDialog()
        await dialog.find('input').setValue('  Temp ')
        expect(dialog.emitted('change').at(-1)[0]).toBe('Temp')
    })

    test('cannot be confirmed without a name', async () => {
        const { dialog, dialogStore } = mountDialog()
        expect(dialogStore.dialog.disablePrimary).toBe(true)
        await dialog.find('input').setValue('   ')
        expect(dialogStore.dialog.disablePrimary).toBe(true)
        await dialog.find('input').setValue('Temp')
        expect(dialogStore.dialog.disablePrimary).toBe(false)
    })

    test('cannot be confirmed again while the schema is being created', async () => {
        const { dialog, dialogStore } = mountDialog()
        await dialog.find('input').setValue('Temp')
        await dialog.setProps({ creating: true })
        expect(dialogStore.dialog.disablePrimary).toBe(true)
    })

    test('shows an error from the server on the field', async () => {
        const { dialog } = mountDialog({ error: 'The name is already in use in this team' })
        expect(dialog.find('[data-el="error"]').text()).toBe('The name is already in use in this team')
    })
})
