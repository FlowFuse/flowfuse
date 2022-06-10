import { mount } from '@vue/test-utils'
import NavItem from '@/components/NavItem.vue'
import { expect } from 'vitest'

import { CogIcon } from '@heroicons/vue/solid'

describe('NavItem', () => {
    test('mounts correctly', async () => {
        expect(NavItem).toBeTruthy()

        const wrapper = mount(NavItem, {
            props: {
                label: 'nav item'
            }
        })

        expect(wrapper.find('label').text()).toEqual('nav item')
    })

    test('shows the icon when provided', async () => {
        expect(NavItem).toBeTruthy()

        const wrapper = mount(NavItem, {
            props: {
                label: 'nav item',
                icon: CogIcon
            }
        })

        expect(wrapper.find('label').text()).toEqual('nav item')
        expect(wrapper.find('svg').exists()).toBe(true)
    })

    test('hides the image element when no icon is when provided', async () => {
        expect(NavItem).toBeTruthy()

        const wrapper = mount(NavItem, {
            props: {
                label: 'nav item'
            }
        })

        expect(wrapper.find('label').text()).toEqual('nav item')
        expect(wrapper.find('svg').exists()).toBe(false)
    })

    test('shows the the user avatar when an avatar src is provided', async () => {
        expect(NavItem).toBeTruthy()

        const wrapper = mount(NavItem, {
            props: {
                label: 'nav item',
                avatar: '<avatar-src>'
            }
        })

        expect(wrapper.find('label').text()).toEqual('nav item')
        expect(wrapper.find('img').exists()).toBe(true)
    })

    test('hides the image element when no icon is when provided', async () => {
        expect(NavItem).toBeTruthy()

        const wrapper = mount(NavItem, {
            props: {
                label: 'nav item'
            }
        })

        expect(wrapper.find('label').text()).toEqual('nav item')
        expect(wrapper.find('img').exists()).toBe(false)
    })
})
