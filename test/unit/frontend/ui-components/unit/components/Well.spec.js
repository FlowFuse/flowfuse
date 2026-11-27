import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

import FfWell from '../../../../../../frontend/src/ui-components/components/Well.vue'

describe('ff-well', () => {
    test('shows what it is given inside its box', () => {
        const well = mount(FfWell, { slots: { default: '<p>Adds the unit field.</p>' } })
        expect(well.classes()).toContain('ff-well')
        expect(well.find('p').text()).toBe('Adds the unit field.')
    })

    test('takes the classes of where it is used, to scroll or keep line breaks there', () => {
        const well = mount(FfWell, { attrs: { class: 'overflow-y-auto' } })
        expect(well.classes()).toEqual(expect.arrayContaining(['ff-well', 'overflow-y-auto']))
    })
})
