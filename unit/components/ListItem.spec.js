import { mount } from '@vue/test-utils'
import ListItem from '@/components/ListItem.vue'

describe('ListItem', () => {
    it('renders the passed label', async () => {
        const wrapper = mount(ListItem, {
            props: {
                label: 'my list item'
            }
        })

        expect(wrapper.text()).toMatch('my list item')

        await wrapper.setProps({ label: 'new label' })

        expect(wrapper.text()).toMatch('new label')
    })

    it('can be visually disabled', async () => {
        const wrapper = mount(ListItem, {
            props: {
                disabled: true
            }
        })

        expect(wrapper.classes('disabled')).toBe(true)

        await wrapper.setProps({ disabled: false })

        expect(wrapper.classes('disabled')).toBe(false)
    })
})
