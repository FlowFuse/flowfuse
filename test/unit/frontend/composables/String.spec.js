import { describe, expect, test } from 'vitest'

import { escapeHtml, safeStringify } from '../../../../frontend/src/composables/strings/String.js'

describe('escapeHtml', () => {
    test('escapes HTML-significant characters', () => {
        expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;')
        expect(escapeHtml('a & b "c" \'d\'')).toBe('a &amp; b &quot;c&quot; &#39;d&#39;')
    })

    test('leaves an ordinary string unchanged', () => {
        expect(escapeHtml('my-device')).toBe('my-device')
    })

    test('coerces non-string values', () => {
        expect(escapeHtml(42)).toBe('42')
        expect(escapeHtml(null)).toBe('null')
    })
})

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
