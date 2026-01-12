import { Menu, MenuItems } from '@headlessui/vue'
import { mount } from '@vue/test-utils'
import { expect } from 'vitest'

import ListItem from '../../../../../../frontend/src/ui-components/components/ListItem.vue'

describe('ListItem', () => {
    const mountListItem = (initialProps) => {
        return mount({
            components: { Menu, MenuItems, ListItem },
            props: ['label', 'disabled', 'kind', 'icon'],
            template: `
                <Menu>
                    <MenuItems static>
                        <ListItem v-bind="$props" />
                    </MenuItems>
                </Menu>
            `
        }, {
            props: initialProps
        })
    }

    it('renders the passed label', async () => {
        const wrapper = mountListItem({ label: 'my list item' })

        expect(wrapper.text()).toMatch('my list item')

        await wrapper.setProps({ label: 'new label' })

        expect(wrapper.text()).toMatch('new label')
    })

    it('can be visually disabled', async () => {
        const wrapper = mountListItem({ disabled: true })

        const item = wrapper.find('.ff-list-item')
        expect(item.classes('disabled')).toBe(true)

        await wrapper.setProps({ disabled: false })

        expect(item.classes('disabled')).toBe(false)
    })
})
