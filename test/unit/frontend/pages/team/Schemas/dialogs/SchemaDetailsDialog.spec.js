import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, test } from 'vitest'

import SchemaDetailsDialog from '../../../../../../../frontend/src/pages/team/Schemas/dialogs/SchemaDetailsDialog.vue'
import { useUxDialogStore } from '../../../../../../../frontend/src/stores/ux-dialog.js'

function mountDialog (props = {}) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const dialog = mount(SchemaDetailsDialog, {
        props: { error: '', busy: false, groups: [], ...props },
        global: {
            plugins: [pinia],
            stubs: {
                'ff-combobox': { name: 'ff-combobox', props: ['modelValue', 'options'], emits: ['update:modelValue'], template: '<div data-el="combobox" />' },
                FormRow: {
                    name: 'FormRow',
                    props: ['modelValue', 'error', 'options'],
                    emits: ['update:modelValue'],
                    template: '<div><slot name="input"><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></slot><span data-el="error">{{ error }}</span></div>'
                }
            }
        }
    })
    return { dialog, dialogStore: useUxDialogStore(pinia) }
}

describe('Schema details dialog', () => {
    test('reports the name and the description, both trimmed', async () => {
        const { dialog } = mountDialog()
        await dialog.find('input').setValue('  Temp ')
        expect(dialog.emitted('change').at(-1)[0]).toEqual({ name: 'Temp', description: '', groupId: '' })
        await dialog.find('textarea').setValue(' Reading from a sensor ')
        expect(dialog.emitted('change').at(-1)[0]).toEqual({ name: 'Temp', description: 'Reading from a sensor', groupId: '' })
    })

    test('offers the groups of the team, with no group picked to start with', async () => {
        const { dialog } = mountDialog({ groups: [{ id: 'g1', name: 'Energy' }] })
        const group = dialog.findComponent({ name: 'ff-combobox' })
        expect(group.props('options')).toEqual([{ label: 'No group', value: 'none' }, { label: 'Energy', value: 'g1' }])
        expect(group.props('modelValue')).toBe('none')
        await group.vm.$emit('update:modelValue', 'g1')
        expect(dialog.emitted('change').at(-1)[0].groupId).toBe('g1')
        await group.vm.$emit('update:modelValue', 'none')
        expect(dialog.emitted('change').at(-1)[0].groupId).toBe('')
    })

    test('leaves the group out for a team with no groups', () => {
        expect(mountDialog().dialog.find('[data-el="combobox"]').exists()).toBe(false)
    })

    test('can be confirmed with a name and no description', async () => {
        const { dialog, dialogStore } = mountDialog()
        await dialog.find('input').setValue('Temp')
        expect(dialogStore.dialog.disablePrimary).toBe(false)
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
        await dialog.setProps({ busy: true })
        expect(dialogStore.dialog.disablePrimary).toBe(true)
    })

    test('shows an error from the server on the field', async () => {
        const { dialog } = mountDialog({ error: 'The name is already in use in this team' })
        expect(dialog.find('[data-el="error"]').text()).toBe('The name is already in use in this team')
    })

    describe('for an existing schema', () => {
        const editing = { schema: { name: 'Temp', description: 'Old', group: { id: 'g1', name: 'Energy' } }, groups: [{ id: 'g1', name: 'Energy' }] }

        test('starts from the schema\'s name, description and group', () => {
            const { dialog } = mountDialog(editing)
            expect(dialog.find('input').element.value).toBe('Temp')
            expect(dialog.find('textarea').element.value).toBe('Old')
            expect(dialog.findComponent({ name: 'ff-combobox' }).props('modelValue')).toBe('g1')
        })

        test('cannot be saved until something changes, and again not when it is changed back', async () => {
            const { dialog, dialogStore } = mountDialog(editing)
            expect(dialogStore.dialog.disablePrimary).toBe(true)
            await dialog.find('textarea').setValue('New')
            expect(dialogStore.dialog.disablePrimary).toBe(false)
            await dialog.find('textarea').setValue('Old')
            expect(dialogStore.dialog.disablePrimary).toBe(true)
        })

        test('can be saved when only the group changes, to another group or to none', async () => {
            const { dialog, dialogStore } = mountDialog(editing)
            await dialog.findComponent({ name: 'ff-combobox' }).vm.$emit('update:modelValue', 'none')
            expect(dialogStore.dialog.disablePrimary).toBe(false)
            expect(dialog.emitted('change').at(-1)[0]).toEqual({ name: 'Temp', description: 'Old', groupId: '' })
        })
    })
})
