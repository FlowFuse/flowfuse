import { mount } from '@vue/test-utils'
import { expect } from 'vitest'

import AuditEntryUpdates from '../../../../../frontend/src/components/audit-log/AuditEntryUpdates.vue'

describe('AuditEntryUpdates', () => {
    const updates = [
        { key: 'target', old: "instance 'dev'", new: "instance 'prod'", dif: 'updated' },
        { key: 'url', old: 'https://github.com/org/old', new: 'https://github.com/org/new', dif: 'updated' }
    ]

    test('shows old and new values for a pipeline stage update', () => {
        const wrapper = mount(AuditEntryUpdates, {
            props: { entry: { event: 'application.pipeline.stage-updated', body: { updates } } }
        })

        expect(wrapper.text()).toContain("Old value: 'instance 'dev''. New value: 'instance 'prod''.")
        expect(wrapper.text()).toContain("Old value: 'https://github.com/org/old'. New value: 'https://github.com/org/new'.")
    })

    test('keeps the same keys value free on other events', () => {
        const wrapper = mount(AuditEntryUpdates, {
            props: { entry: { event: 'project.settings.updated', body: { updates } } }
        })

        expect(wrapper.text()).toContain("Changed: 'target'.")
        expect(wrapper.text()).toContain("Changed: 'url'.")
        expect(wrapper.text()).not.toContain('Old value')
    })
})
