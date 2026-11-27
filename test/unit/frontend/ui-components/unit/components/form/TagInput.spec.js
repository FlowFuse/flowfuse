import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TagInput from '../../../../../../../frontend/src/ui-components/components/form/TagInput.vue'

function mountInput (modelValue = ['a', 'b']) {
    return mount(TagInput, { props: { modelValue, ariaLabel: 'Allowed values' } })
}

const emitted = (input) => input.emitted('update:modelValue').at(-1)[0]

describe('Form > TagInput', () => {
    it('shows the values and labels the input', () => {
        const input = mountInput()
        expect(input.findAll('.ff-tag-input__tag').map(tag => tag.text())).toEqual(['a', 'b'])
        expect(input.find('input').attributes('aria-label')).toBe('Allowed values')
    })

    it('adds the typed value on Enter or a comma, without repeating one', async () => {
        const input = mountInput()
        await input.find('input').setValue('c')
        await input.find('input').trigger('keydown', { key: 'Enter' })
        expect(emitted(input)).toEqual(['a', 'b', 'c'])
        await input.find('input').setValue('d')
        await input.find('input').trigger('keydown', { key: ',' })
        expect(emitted(input)).toEqual(['a', 'b', 'd'])
        await input.find('input').setValue('a')
        await input.find('input').trigger('keydown', { key: 'Enter' })
        expect(input.emitted('update:modelValue')).toHaveLength(2)
    })

    it('does not add on blur', async () => {
        const input = mountInput()
        await input.find('input').setValue('c')
        await input.find('input').trigger('blur')
        expect(input.emitted('update:modelValue')).toBeUndefined()
    })

    it('adds the typed value when the parent commits it', async () => {
        const input = mountInput()
        await input.find('input').setValue('c')
        input.vm.commit()
        expect(emitted(input)).toEqual(['a', 'b', 'c'])
    })

    it('removes a value with its button, which does not submit a form', async () => {
        const input = mountInput()
        const button = input.find('[aria-label="Remove a"]')
        expect(button.attributes('type')).toBe('button')
        await button.trigger('click')
        expect(emitted(input)).toEqual(['b'])
    })

    it('removes the last value on Backspace in an empty input only', async () => {
        const input = mountInput()
        await input.find('input').setValue('x')
        await input.find('input').trigger('keydown', { key: 'Backspace' })
        expect(input.emitted('update:modelValue')).toBeUndefined()
        await input.find('input').setValue('')
        await input.find('input').trigger('keydown', { key: 'Backspace' })
        expect(emitted(input)).toEqual(['a'])
    })
})
