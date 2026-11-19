import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

import PublishSchemaDialog from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/dialogs/PublishSchemaDialog.vue'

function mountDialog () {
    const dialog = mount(PublishSchemaDialog, {
        props: { schemaName: 'Temperature', latestVersion: '1.2.0', existingVersions: ['1.2.0', '1.1.0'], draftNotes: 'notes' },
        global: {
            stubs: {
                'ff-dialog': { template: '<div><slot /><button data-action="confirm" @click="$emit(\'confirm\')" /></div>', methods: { show () {}, close () {} } },
                FormRow: {
                    props: ['modelValue', 'error'],
                    emits: ['update:modelValue'],
                    template: '<div><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"><span data-el="error">{{ error }}</span><slot name="input" /></div>'
                }
            }
        }
    })
    dialog.vm.show()
    return dialog
}

const errorFor = async (version) => {
    const dialog = mountDialog()
    await dialog.find('input').setValue(version)
    return dialog.find('[data-el="error"]').text()
}

describe('Publish schema dialog', () => {
    test('publishes the version exactly as typed', async () => {
        const dialog = mountDialog()
        await dialog.find('input').setValue('1.3.0')
        await dialog.find('[data-action="confirm"]').trigger('click')
        expect(dialog.emitted('publish')[0][0]).toEqual({ version: '1.3.0', notes: 'notes' })
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

    test('shows an error from the server', async () => {
        const dialog = mountDialog()
        dialog.vm.setError('The draft has problems')
        await dialog.vm.$nextTick()
        expect(dialog.find('[data-el="error"]').text()).toBe('The draft has problems')
    })
})
