import { mount } from '@vue/test-utils'
import { expect } from 'vitest'

import ExpiryCell from '../../../../../frontend/src/pages/account/components/ExpiryCell.vue'

const THIRTY_MINUTES = 1000 * 60 * 30
const IN_90_DAYS = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

describe('ExpiryCell', () => {
    test('renders the expiry date for a plain token', () => {
        const wrapper = mount(ExpiryCell, { props: { expiresAt: IN_90_DAYS } })
        expect(wrapper.text()).toEqual(new Date(IN_90_DAYS).toLocaleDateString())
    })

    test('renders Never for a token without expiry', () => {
        const wrapper = mount(ExpiryCell, { props: { expiresAt: null } })
        expect(wrapper.text()).toEqual('Never')
    })

    test('renders the chosen grant end date for an auto-renewing token', () => {
        const wrapper = mount(ExpiryCell, {
            props: { expiresAt: null, autoRenews: { every: THIRTY_MINUTES, until: IN_90_DAYS, chosen: true } }
        })
        expect(wrapper.text()).toEqual(`Auto-renews until ${new Date(IN_90_DAYS).toLocaleDateString()}`)
    })

    test('renders a plain auto-renews label when no grant end date was chosen', () => {
        const wrapper = mount(ExpiryCell, {
            props: { expiresAt: null, autoRenews: { every: THIRTY_MINUTES, until: IN_90_DAYS, chosen: false } }
        })
        expect(wrapper.text()).toEqual('Auto-renews')
    })

    test('explains the renewal cycle in a tooltip, derived from the backend value', () => {
        const wrapper = mount(ExpiryCell, {
            props: { expiresAt: null, autoRenews: { every: THIRTY_MINUTES, until: IN_90_DAYS, chosen: true } }
        })
        const tooltip = wrapper.find('[title]').attributes('title')
        expect(tooltip).toContain('30 minutes')
        expect(tooltip).toContain(new Date(IN_90_DAYS).toLocaleDateString())
    })

    test('the tooltip cadence follows the backend value, nothing hardcoded', () => {
        const wrapper = mount(ExpiryCell, {
            props: { expiresAt: null, autoRenews: { every: 1000 * 60 * 15, until: IN_90_DAYS, chosen: true } }
        })
        expect(wrapper.find('[title]').attributes('title')).toContain('15 minutes')
    })
})
