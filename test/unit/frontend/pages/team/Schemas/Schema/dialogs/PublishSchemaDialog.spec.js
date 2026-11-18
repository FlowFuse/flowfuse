import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

import PublishSchemaDialog from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/dialogs/PublishSchemaDialog.vue'

describe('Publish schema dialog', () => {
    test('publishes the version exactly as typed', async () => {
        const dialog = mount(PublishSchemaDialog, {
            props: { schemaName: 'Temperature', latestVersion: '1.2.0', draftNotes: 'notes' },
            global: {
                stubs: {
                    'ff-dialog': { template: '<div><slot /><button data-action="confirm" @click="$emit(\'confirm\')" /></div>', methods: { show () {}, close () {} } },
                    FormRow: { props: ['modelValue'], emits: ['update:modelValue'], template: '<div><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"><slot name="input" /></div>' }
                }
            }
        })
        dialog.vm.show()
        await dialog.find('input').setValue(' 1.3.0')
        await dialog.find('[data-action="confirm"]').trigger('click')
        expect(dialog.emitted('publish')[0][0]).toEqual({ version: ' 1.3.0', notes: 'notes' })
    })
})
