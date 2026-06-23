import { describe, expect, test } from 'vitest'

import { TRANSITION_STATES, isTransitionState } from '../../../../frontend/src/utils/stateTransitions.ts'

describe('isTransitionState', () => {
    test('true for every transition state', () => {
        for (const state of TRANSITION_STATES) {
            expect(isTransitionState(state)).toBe(true)
        }
    })

    test('false for settled / terminal states', () => {
        for (const state of ['running', 'stopped', 'suspended', 'safe', 'crashed', 'error', 'protected', 'warning', 'offline', 'unknown']) {
            expect(isTransitionState(state)).toBe(false)
        }
    })

    test('false for null / undefined / empty', () => {
        expect(isTransitionState(null)).toBe(false)
        expect(isTransitionState(undefined)).toBe(false)
        expect(isTransitionState('')).toBe(false)
    })
})
