import { describe, expect, test } from 'vitest'

import { useInstanceStates } from '../../../../frontend/src/composables/InstanceStates.js'

describe('useInstanceStates().isTransitionState', () => {
    const { isTransitionState, transitionStates } = useInstanceStates()

    test('true for every transition state', () => {
        for (const state of transitionStates) {
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

describe('useInstanceStates().resolveSearchStates', () => {
    const { resolveSearchStates, statesMap } = useInstanceStates()

    test('group words expand to their group', () => {
        expect(resolveSearchStates('running')).toEqual(statesMap.running)
        expect(resolveSearchStates('error')).toEqual(statesMap.error)
        expect(resolveSearchStates('stopped')).toEqual(statesMap.stopped)
    })

    test('individual known states resolve to that exact state', () => {
        expect(resolveSearchStates('warning')).toEqual(['warning'])
        expect(resolveSearchStates('crashed')).toEqual(['crashed'])
        expect(resolveSearchStates('suspended')).toEqual(['suspended'])
    })

    test('is case-insensitive and trims whitespace', () => {
        expect(resolveSearchStates('  Warning ')).toEqual(['warning'])
    })

    test('null for unrecognised terms and empty input', () => {
        expect(resolveSearchStates('prod-api')).toBe(null)
        expect(resolveSearchStates('runn')).toBe(null)
        expect(resolveSearchStates('')).toBe(null)
        expect(resolveSearchStates(null)).toBe(null)
    })
})
