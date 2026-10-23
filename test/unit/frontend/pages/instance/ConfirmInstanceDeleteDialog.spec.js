import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'

enableAutoUnmount(afterEach)

const mocks = vi.hoisted(() => ({
    instanceAPI: { deleteInstance: vi.fn() },
    alerts: { emit: vi.fn() }
}))

vi.mock('@/api/instances.js', () => ({ default: mocks.instanceAPI }))
vi.mock('@/services/alerts.js', () => ({ default: mocks.alerts }))

import ConfirmInstanceDeleteDialog from '../../../../../frontend/src/pages/instance/Settings/dialogs/ConfirmInstanceDeleteDialog.vue'

const instance = { id: 'abc', name: 'my-instance' }

function mountDialog () {
    const wrapper = mount(ConfirmInstanceDeleteDialog, {
        props: { instance },
        global: {
            stubs: {
                'ff-dialog': {
                    name: 'ff-dialog',
                    template: '<div><slot /></div>',
                    methods: { show () {}, close () {} }
                },
                FormRow: true
            }
        }
    })
    // Simulate the user typing the instance name to confirm
    wrapper.vm.localInstance = instance
    wrapper.vm.input.instanceName = instance.name
    return wrapper
}

describe('ConfirmInstanceDeleteDialog', () => {
    afterEach(() => {
        mocks.instanceAPI.deleteInstance.mockReset()
        mocks.alerts.emit.mockReset()
    })

    test('keeps the dialog open and the action disabled until the backend confirms', async () => {
        let resolveDelete
        mocks.instanceAPI.deleteInstance.mockReturnValue(new Promise(resolve => { resolveDelete = resolve }))
        const wrapper = mountDialog()
        const closeSpy = vi.spyOn(wrapper.vm.$refs.dialog, 'close')

        wrapper.vm.deleteInstance()
        await flushPromises()

        // Request is in flight: button disabled, dialog still open, no result yet
        expect(wrapper.vm.loading).toBe(true)
        expect(closeSpy).not.toHaveBeenCalled()
        expect(wrapper.emitted().confirm).toBeUndefined()
        expect(mocks.alerts.emit).not.toHaveBeenCalled()

        resolveDelete()
        await flushPromises()

        // Backend confirmed: dialog closes, parent notified, one success alert
        expect(closeSpy).toHaveBeenCalledOnce()
        expect(wrapper.emitted().confirm).toHaveLength(1)
        expect(mocks.alerts.emit).toHaveBeenCalledWith('Instance successfully deleted.', 'confirmation')
        expect(wrapper.vm.loading).toBe(false)
    })

    test('ignores a second delete while one is already in flight', async () => {
        mocks.instanceAPI.deleteInstance.mockReturnValue(new Promise(() => {}))
        const wrapper = mountDialog()

        wrapper.vm.deleteInstance()
        wrapper.vm.deleteInstance()
        await flushPromises()

        expect(mocks.instanceAPI.deleteInstance).toHaveBeenCalledOnce()
    })

    test('reports a failure without closing or emitting success', async () => {
        mocks.instanceAPI.deleteInstance.mockRejectedValue(new Error('boom'))
        const wrapper = mountDialog()
        const closeSpy = vi.spyOn(wrapper.vm.$refs.dialog, 'close')

        wrapper.vm.deleteInstance()
        await flushPromises()

        expect(closeSpy).not.toHaveBeenCalled()
        expect(wrapper.emitted().confirm).toBeUndefined()
        expect(mocks.alerts.emit).toHaveBeenCalledWith('Instance failed to delete.', 'warning')
        expect(wrapper.vm.loading).toBe(false)
    })
})
