import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

import FfButton from '../../../../../../frontend/src/ui-components/components/Button.vue'

describe('ff-button', () => {
    test('renders the expert kind class', () => {
        const wrapper = mount(FfButton, { props: { kind: 'expert' }, slots: { default: 'Build' } })
        expect(wrapper.classes()).toContain('ff-btn--expert')
    })

    test('centres its label by default and aligns it left when asked', () => {
        const centred = mount(FfButton, { slots: { default: 'Build' } })
        expect(centred.find('.clipped-overflow').classes()).toContain('justify-center')

        const left = mount(FfButton, { props: { kind: 'plain', align: 'left' }, slots: { default: 'Build' } })
        expect(left.classes()).toContain('ff-btn--plain')
        expect(left.find('.clipped-overflow').classes()).toContain('justify-start')
    })
})
