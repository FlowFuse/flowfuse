import { describe, expect, test } from 'vitest'

import { InstanceStateMutator } from '../../../../frontend/src/utils/InstanceStateMutator.ts'

describe('InstanceStateMutator.setStateAsPendingFromServer', () => {
    test('sets pending while the instance is still transitioning', () => {
        const instance = { meta: { state: 'starting' }, optimisticStateChange: true, pendingStateChange: false }
        new InstanceStateMutator(instance).setStateAsPendingFromServer()
        expect(instance.pendingStateChange).toBe(true)
        expect(instance.optimisticStateChange).toBe(false)
    })

    // the race the fix guards against: a live update settles + clears the flags before the action's HTTP .then() runs
    test('no-ops once a live update has already settled the state', () => {
        const instance = { meta: { state: 'suspended' }, optimisticStateChange: false, pendingStateChange: false }
        new InstanceStateMutator(instance).setStateAsPendingFromServer()
        expect(instance.pendingStateChange).toBe(false)
        expect(instance.optimisticStateChange).toBe(false)
    })

    test('still applies an explicit newState even when settled', () => {
        const instance = { meta: { state: 'running' }, optimisticStateChange: false, pendingStateChange: false }
        new InstanceStateMutator(instance).setStateAsPendingFromServer('stopping')
        expect(instance.pendingStateChange).toBe(true)
        expect(instance.meta.state).toBe('stopping')
    })
})
