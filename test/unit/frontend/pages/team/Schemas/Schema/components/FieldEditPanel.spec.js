import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

import FieldEditPanel from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/FieldEditPanel.vue'

const ROOT = { type: 'object', required: ['unit'], properties: { unit: { type: 'string', enum: ['Cel'] }, sensor: { type: 'object', properties: {} } } }

function mountPanel (pointer = '/properties/unit') {
    return mount(FieldEditPanel, {
        props: { root: ROOT, pointer },
        global: {
            stubs: {
                'ff-text-input': { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">' },
                'ff-listbox': { props: ['modelValue', 'options'], emits: ['update:modelValue'], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>' },
                'ff-checkbox': { props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)">' },
                'ff-button': { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' }
            }
        }
    })
}

const applied = (panel) => panel.emitted('apply').at(-1)[0]

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
        const input = panel.find('[data-form="field-add-value"]')
        await input.setValue('degF')
        await input.trigger('keydown', { key: 'Enter' })
        await input.setValue('K')
        await input.trigger('keydown', { key: ',' })
        await panel.find('[aria-label="Remove Cel"]').trigger('click')
        await panel.find('[data-action="field-apply"]').trigger('click')
        expect(applied(panel).properties.unit.enum).toEqual(['degF', 'K'])
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

    test('cancels', async () => {
        const panel = mountPanel()
        await panel.find('[data-action="field-cancel"]').trigger('click')
        expect(panel.emitted('cancel')).toHaveLength(1)
    })
})
