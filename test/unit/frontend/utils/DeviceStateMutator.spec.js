import { describe, expect, test } from 'vitest'

import { DeviceStateMutator } from '../../../../frontend/src/utils/DeviceStateMutator.ts'

describe('DeviceStateMutator.setStateAsPendingFromServer', () => {
    test('sets pending while the device is still transitioning', () => {
        const device = { status: 'restarting', optimisticStateChange: true, pendingStateChange: false }
        new DeviceStateMutator(device).setStateAsPendingFromServer()
        expect(device.pendingStateChange).toBe(true)
        expect(device.optimisticStateChange).toBe(false)
    })

    // the race the fix guards against: a live update settles + clears the flags before the action's HTTP .then() runs
    test('no-ops once the device has already settled', () => {
        const device = { status: 'running', optimisticStateChange: false, pendingStateChange: false }
        new DeviceStateMutator(device).setStateAsPendingFromServer()
        expect(device.pendingStateChange).toBe(false)
    })
})
