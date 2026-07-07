import { describe, expect, test } from 'vitest'

import { safeStringify } from '../../../../frontend/src/composables/strings/String.js'

describe('safeStringify', () => {
    test('prettifies objects with two-space indentation', () => {
        expect(safeStringify({ a: 1, b: [2, 3] })).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}')
    })

    test('stringifies scalars', () => {
        expect(safeStringify(42)).toBe('42')
        expect(safeStringify('hi')).toBe('"hi"')
    })

    test('returns the fallback when the value cannot be serialised', () => {
        const circular = {}
        circular.self = circular
        expect(safeStringify(circular)).toBe('Could not display the payload.')
    })

    test('accepts a custom fallback message', () => {
        const circular = {}
        circular.self = circular
        expect(safeStringify(circular, 'nope')).toBe('nope')
    })
})
