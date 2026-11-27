import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import { markRaw } from 'vue'

import FieldEditPanel from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/FieldEditPanel.vue'
import TagInput from '../../../../../../../../frontend/src/ui-components/components/form/TagInput.vue'

const ROOT = { type: 'object', required: ['unit'], properties: { unit: { type: 'string', enum: ['Cel'] }, sensor: { type: 'object', properties: {} } } }

const STUBS = {
    'ff-text-input': { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">' },
    'ff-listbox': { props: ['modelValue', 'options'], emits: ['update:modelValue'], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>' },
    'ff-checkbox': { props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)">' },
    'ff-tag-input': TagInput,
    'ff-button': { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' }
}

function mountPanel (pointer = '/properties/unit') {
    return mount(FieldEditPanel, {
        props: { root: markRaw(ROOT), pointer },
        global: {
            stubs: STUBS
        }
    })
}

const applied = (panel) => panel.emitted('apply').at(-1)[0].root

describe('Field edit panel', () => {
    test('applies the changes made in it', async () => {
        const panel = mountPanel()
        await panel.find('[data-form="field-name"]').setValue('units')
        await panel.find('[data-form="field-description"]').setValue('SenML unit name')
        await panel.find('[data-action="field-apply"]').trigger('click')
        expect(applied(panel)).toMatchObject({ required: ['units'], properties: { units: { type: 'string', enum: ['Cel'], description: 'SenML unit name' } } })
    })

    test('adds allowed values on Enter or a comma, and removes them', async () => {
        const panel = mountPanel()
        const input = panel.find('[data-form="field-allowed-values"] input')
        await input.setValue('degF')
        await input.trigger('keydown', { key: 'Enter' })
        await input.setValue('K')
        await input.trigger('keydown', { key: ',' })
        await panel.find('[aria-label="Remove Cel"]').trigger('click')
        await panel.find('[data-action="field-apply"]').trigger('click')
        expect(applied(panel).properties.unit.enum).toEqual(['degF', 'K'])
    })

    test('applies a value typed but not yet entered', async () => {
        const panel = mountPanel()
        await panel.find('[data-form="field-allowed-values"] input').setValue('K')
        await panel.find('[data-action="field-apply"]').trigger('click')
        expect(applied(panel).properties.unit.enum).toEqual(['Cel', 'K'])
    })

    test('says why a field cannot be applied, and does not apply it', async () => {
        const panel = mountPanel()
        await panel.find('[data-form="field-name"]').setValue('sensor')
        expect(panel.find('[data-el="field-problem"]').text()).toBe('There is already a field called sensor here.')
        expect(panel.find('[data-action="field-apply"]').attributes('disabled')).toBeDefined()
    })

    test('shows the constraints of the type picked', async () => {
        const panel = mountPanel()
        expect(panel.find('[data-form="field-pattern"]').exists()).toBe(true)
        await panel.find('[data-form="field-type"]').setValue('array')
        expect(panel.find('[data-form="field-pattern"]').exists()).toBe(false)
        expect(panel.find('[data-form="field-unique-items"]').exists()).toBe(true)
    })

    test('lets an object refuse fields it does not list', async () => {
        const panel = mountPanel('/properties/sensor')
        await panel.find('[data-form="field-other-fields"]').setValue(false)
        await panel.find('[data-action="field-apply"]').trigger('click')
        expect(applied(panel).properties.sensor.additionalProperties).toBe(false)
    })

    test('emits the pointer the field has after a rename', async () => {
        const panel = mountPanel()
        await panel.find('[data-form="field-name"]').setValue('units')
        await panel.find('[data-action="field-apply"]').trigger('click')
        expect(panel.emitted('apply').at(-1)[0].pointer).toBe('/properties/units')
    })

    test('drops the allowed values the new type cannot have, so a type change is not held up by them', async () => {
        const panel = mountPanel()
        const input = panel.find('[data-form="field-allowed-values"] input')
        await input.setValue('12')
        await input.trigger('keydown', { key: 'Enter' })
        await panel.find('[data-form="field-type"]').setValue('number')
        expect(panel.find('[data-el="field-problem"]').exists()).toBe(false)
        await panel.find('[data-action="field-apply"]').trigger('click')
        expect(applied(panel).properties.unit).toEqual({ type: 'number', enum: [12] })
    })

    test('shows Any as picked for a format or an item type the field does not state, and what it states when the lists lack it', async () => {
        const root = markRaw({ type: 'object', properties: { text: { type: 'string' }, period: { type: 'string', format: 'duration' }, list: { type: 'array' } } })
        const mountFor = (pointer) => mount(FieldEditPanel, { props: { root, pointer }, global: { stubs: STUBS } })
        const text = mountFor('/properties/text')
        expect(text.find('[data-form="field-format"]').element.value).toBe('any')
        expect(mountFor('/properties/period').find('[data-form="field-format"]').element.value).toBe('duration')
        expect(mountFor('/properties/list').find('[data-form="field-item-type"]').element.value).toBe('any')
        // picking Any writes no format, and an untouched one is left as it was
        await text.find('[data-form="field-format"]').setValue('email')
        await text.find('[data-form="field-format"]').setValue('any')
        await text.find('[data-action="field-apply"]').trigger('click')
        expect(applied(text).properties.text).toEqual({ type: 'string' })
    })

    test('cancels', async () => {
        const panel = mountPanel()
        await panel.find('[data-action="field-cancel"]').trigger('click')
        expect(panel.emitted('cancel')).toHaveLength(1)
    })
})
