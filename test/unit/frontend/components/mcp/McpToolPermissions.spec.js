import { mount } from '@vue/test-utils'
import { expect } from 'vitest'

import McpToolPermissions from '../../../../../frontend/src/components/mcp/McpToolPermissions.vue'
import FFUIComponents from '../../../../../frontend/src/ui-components/index.js'

function baseValue () {
    return {
        platform: { read: true, write: true, destructive: false },
        flow_building: { read: false, write: false, destructive: false }
    }
}

function mountBound (initial = baseValue()) {
    let current = initial
    const wrapper = mount(McpToolPermissions, {
        props: {
            modelValue: current,
            'onUpdate:modelValue': (value) => {
                current = value
                wrapper.setProps({ modelValue: value })
            }
        },
        global: { plugins: [FFUIComponents] }
    })
    return wrapper
}

function checkbox (wrapper, group, category) {
    const index = ['read', 'write', 'destructive'].indexOf(category)
    return wrapper.find(`[data-group="${group}"]`).findAll('.ff-checkbox')[index].find('input')
}

describe('McpToolPermissions', () => {
    test('renders the current state of each checkbox', () => {
        const wrapper = mountBound()
        expect(checkbox(wrapper, 'platform', 'read').element.checked).toBe(true)
        expect(checkbox(wrapper, 'platform', 'write').element.checked).toBe(true)
        expect(checkbox(wrapper, 'platform', 'destructive').element.checked).toBe(false)
        expect(checkbox(wrapper, 'flow_building', 'read').element.checked).toBe(false)
    })

    test('ticking write also ticks read', async () => {
        const wrapper = mountBound({
            platform: { read: false, write: false, destructive: false },
            flow_building: { read: false, write: false, destructive: false }
        })
        await checkbox(wrapper, 'platform', 'write').setValue(true)
        expect(wrapper.emitted('update:modelValue')[0][0].platform).toEqual({ read: true, write: true, destructive: false })
    })

    test('ticking destructive also ticks write and read', async () => {
        const wrapper = mountBound({
            platform: { read: false, write: false, destructive: false },
            flow_building: { read: false, write: false, destructive: false }
        })
        await checkbox(wrapper, 'platform', 'destructive').setValue(true)
        expect(wrapper.emitted('update:modelValue')[0][0].platform).toEqual({ read: true, write: true, destructive: true })
    })

    test('unticking read clears the whole row', async () => {
        const wrapper = mountBound({
            platform: { read: true, write: true, destructive: true },
            flow_building: { read: false, write: false, destructive: false }
        })
        await checkbox(wrapper, 'platform', 'read').setValue(false)
        expect(wrapper.emitted('update:modelValue')[0][0].platform).toEqual({ read: false, write: false, destructive: false })
    })

    test('unticking write also clears destructive, leaving read', async () => {
        const wrapper = mountBound({
            platform: { read: true, write: true, destructive: true },
            flow_building: { read: false, write: false, destructive: false }
        })
        await checkbox(wrapper, 'platform', 'write').setValue(false)
        expect(wrapper.emitted('update:modelValue')[0][0].platform).toEqual({ read: true, write: false, destructive: false })
    })

    test('does not disturb the other group', async () => {
        const wrapper = mountBound({
            platform: { read: true, write: true, destructive: false },
            flow_building: { read: true, write: false, destructive: false }
        })
        await checkbox(wrapper, 'platform', 'destructive').setValue(true)
        const emitted = wrapper.emitted('update:modelValue')[0][0]
        expect(emitted.flow_building).toEqual({ read: true, write: false, destructive: false })
    })

    test('explains destructive tools in a tooltip on its header', () => {
        const wrapper = mountBound()
        expect(wrapper.find('[data-category="destructive"]').attributes('title')).toContain("change what's running")
        expect(wrapper.find('[data-category="read"]').attributes('title')).toBeUndefined()
    })
})
