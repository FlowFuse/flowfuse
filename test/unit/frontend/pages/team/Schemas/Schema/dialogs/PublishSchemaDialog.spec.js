import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, test } from 'vitest'

import PublishSchemaDialog from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/dialogs/PublishSchemaDialog.vue'
import { useUxDialogStore } from '../../../../../../../../frontend/src/stores/ux-dialog.js'

function mountDialog (props = {}) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const dialog = mount(PublishSchemaDialog, {
        props: { latestVersion: '1.2.0', existingVersions: ['1.2.0', '1.1.0'], draftNotes: 'notes', error: '', publishing: false, ...props },
        global: {
            plugins: [pinia],
            stubs: {
                FormRow: {
                    props: ['modelValue', 'error'],
                    emits: ['update:modelValue'],
                    template: '<div><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"><span data-el="error">{{ error }}</span><slot name="input" /></div>'
                }
            }
        }
    })
    return { dialog, dialogStore: useUxDialogStore(pinia) }
}

const errorFor = async (version) => {
    const { dialog } = mountDialog()
    await dialog.find('input').setValue(version)
    return dialog.find('[data-el="error"]').text()
}

describe('Publish schema dialog', () => {
    test('reports the version exactly as typed, with the notes', async () => {
        const { dialog } = mountDialog()
        await dialog.find('input').setValue('1.3.0')
        expect(dialog.emitted('change').at(-1)[0]).toEqual({ version: '1.3.0', notes: 'notes' })
    })

    test('accepts a version higher than every existing one', async () => {
        expect(await errorFor('1.3.0')).toBe('')
    })

    test('rejects a version that is not higher', async () => {
        expect(await errorFor('1.1.5')).toBe('Must be higher than 1.2.0')
    })

    test('rejects a version that already exists', async () => {
        expect(await errorFor('1.1.0')).toBe('Version 1.1.0 already exists')
    })

    test('rejects a version that is not plain major.minor.patch, without correcting it', async () => {
        expect(await errorFor(' 1.3.0')).toBe('Use a plain major.minor.patch version, e.g. 1.0.0')
        expect(await errorFor('v1.3.0')).toBe('Use a plain major.minor.patch version, e.g. 1.0.0')
    })

    test('checks the version again when the existing versions change', async () => {
        const { dialog } = mountDialog()
        await dialog.find('input').setValue('1.3.0')
        await dialog.setProps({ existingVersions: ['1.3.0', '1.2.0', '1.1.0'] })
        expect(dialog.find('[data-el="error"]').text()).toBe('Version 1.3.0 already exists')
    })

    test('shows an error from the server', async () => {
        const { dialog } = mountDialog()
        await dialog.find('input').setValue('1.3.0')
        await dialog.setProps({ error: 'The draft has problems' })
        expect(dialog.find('[data-el="error"]').text()).toBe('The draft has problems')
    })

    test('only lets a valid version be confirmed', async () => {
        const { dialog, dialogStore } = mountDialog()
        expect(dialogStore.dialog.disablePrimary).toBe(true)
        await dialog.find('input').setValue('1.3.0')
        expect(dialogStore.dialog.disablePrimary).toBe(false)
        await dialog.find('input').setValue('1.1.0')
        expect(dialogStore.dialog.disablePrimary).toBe(true)
    })

    test('an error from the server does not stop another try', async () => {
        const { dialog, dialogStore } = mountDialog()
        await dialog.find('input').setValue('1.3.0')
        await dialog.setProps({ error: 'Something went wrong' })
        expect(dialogStore.dialog.disablePrimary).toBe(false)
    })

    test('cannot be confirmed again while publishing', async () => {
        const { dialog, dialogStore } = mountDialog()
        await dialog.find('input').setValue('1.3.0')
        await dialog.setProps({ publishing: true })
        expect(dialogStore.dialog.disablePrimary).toBe(true)
    })
})
