import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, test } from 'vitest'

import GroupDialog from '../../../../../../../frontend/src/pages/team/Schemas/dialogs/GroupDialog.vue'
import { useUxDialogStore } from '../../../../../../../frontend/src/stores/ux-dialog.js'

function mountDialog (props = {}) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const dialog = mount(GroupDialog, {
        props: { error: '', busy: false, ...props },
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

describe('Schema group dialog', () => {
    test('reports the trimmed name, and cannot be confirmed without one', async () => {
        const { dialog, dialogStore } = mountDialog()
        expect(dialogStore.dialog.disablePrimary).toBe(true)
        await dialog.find('input').setValue('  Energy ')
        expect(dialog.emitted('change').at(-1)[0]).toBe('Energy')
        expect(dialogStore.dialog.disablePrimary).toBe(false)
    })

    test('starts from the current name when renaming, and cannot be confirmed until it changes', async () => {
        const { dialog, dialogStore } = mountDialog({ name: 'Energy' })
        expect(dialog.find('input').element.value).toBe('Energy')
        expect(dialogStore.dialog.disablePrimary).toBe(true)
        await dialog.find('input').setValue('Power')
        expect(dialogStore.dialog.disablePrimary).toBe(false)
    })

    test('cannot be confirmed again while the request is out', async () => {
        const { dialog, dialogStore } = mountDialog()
        await dialog.find('input').setValue('Energy')
        await dialog.setProps({ busy: true })
        expect(dialogStore.dialog.disablePrimary).toBe(true)
    })

    test('shows an error from the server on the field', () => {
        expect(mountDialog({ error: 'The name is already in use in this team' }).dialog.find('[data-el="error"]').text()).toBe('The name is already in use in this team')
    })
})
