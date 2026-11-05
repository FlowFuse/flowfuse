import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

// The real panel drags in the whole expert component tree
vi.mock('@/components/expert/Expert.vue', () => ({
    default: {
        name: 'ExpertPanel',
        inject: { surface: { from: 'expert-surface', default: 'drawer' } },
        template: '<div data-stub="expert-panel" :data-surface="surface" />'
    }
}))

// imported after mocks so vi.mock hoisting resolves correctly
import ExpertFullPage from '../../../../../frontend/src/components/expert/ExpertFullPage.vue'

describe('ExpertFullPage', () => {
    test('renders the panel with the given surface provided', () => {
        const wrapper = mount(ExpertFullPage, { props: { surface: 'building' } })
        const panel = wrapper.find('[data-stub="expert-panel"]')
        expect(panel.exists()).toBe(true)
        expect(panel.attributes('data-surface')).toBe('building')
    })
})
