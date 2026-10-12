import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

import FfButton from '../../../../../../frontend/src/ui-components/components/Button.vue'

describe('ff-button', () => {
    test('renders the expert kind class', () => {
        const wrapper = mount(FfButton, { props: { kind: 'expert' }, slots: { default: 'Build' } })
        expect(wrapper.classes()).toContain('ff-btn--expert')
    })
})
