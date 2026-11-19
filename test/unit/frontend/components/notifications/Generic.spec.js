import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

import GenericNotification from '../../../../../frontend/src/components/notifications/Generic.vue'

function mountWith (notification) {
    return mount(GenericNotification, {
        props: { notification, selections: [] },
        shallow: true
    })
}

describe('GenericNotification', () => {
    test('escapes a user-controlled device name before it reaches v-html', () => {
        const wrapper = mountWith({
            id: 1,
            type: 'device-crashed',
            createdAt: Date.now(),
            data: { device: { id: 'abc', name: '<img src=x onerror=alert(document.domain)>' } }
        })

        const message = wrapper.vm.notificationData.message
        // The payload must be HTML-escaped, so no live markup ends up in v-html
        expect(message).not.toContain('<img')
        expect(message).toContain('&lt;img')
        // The intended template formatting is preserved
        expect(message).toContain('<i>')
        expect(message).toContain('has crashed')
    })

    test('escapes a user-controlled instance name', () => {
        const wrapper = mountWith({
            id: 2,
            type: 'instance-crashed',
            createdAt: Date.now(),
            data: { instance: { id: 'xyz', name: '<script>alert(1)</script>' } }
        })

        const message = wrapper.vm.notificationData.message
        expect(message).not.toContain('<script>')
        expect(message).toContain('&lt;script&gt;')
    })

    test('renders an ordinary name unchanged', () => {
        const wrapper = mountWith({
            id: 3,
            type: 'device-crashed',
            createdAt: Date.now(),
            data: { device: { id: 'abc', name: 'my-device' } }
        })

        expect(wrapper.vm.notificationData.message).toBe('"<i>my-device</i>" has crashed')
    })
})
