import { describe, expect, test } from 'vitest'

import { applyLiveState } from '../../../../frontend/src/utils/applyLiveState.ts'

describe('applyLiveState', () => {
    test('instance: writes meta.state and a mirrored status', () => {
        const out = applyLiveState({ id: 1, meta: { state: 'stopped', foo: 'bar' } }, 'running')
        expect(out.meta.state).toBe('running')
        expect(out.status).toBe('running')
        expect(out.meta.foo).toBe('bar') // preserves other meta fields
    })

    test('device: writes status only, no meta', () => {
        const out = applyLiveState({ id: 1, status: 'stopped' }, 'running', { device: true })
        expect(out.status).toBe('running')
        expect(out.meta).toBeUndefined()
    })

    test('clearFlags clears optimistic/pending', () => {
        const out = applyLiveState({ meta: {}, optimisticStateChange: true, pendingStateChange: true }, 'running', { clearFlags: true })
        expect(out.optimisticStateChange).toBe(false)
        expect(out.pendingStateChange).toBe(false)
    })

    test('without clearFlags the flags are left untouched', () => {
        const out = applyLiveState({ status: 'x', optimisticStateChange: true }, 'running', { device: true })
        expect(out.optimisticStateChange).toBe(true)
    })

    test('returns a new object and preserves unrelated fields', () => {
        const input = { id: 7, name: 'keep', meta: { state: 'stopped' } }
        const out = applyLiveState(input, 'running')
        expect(out).not.toBe(input)
        expect(out.name).toBe('keep')
    })
})
