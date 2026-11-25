import { describe, expect, test } from 'vitest'

import { escapePointer, isObject, pointerFor, unescapePointer } from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/pointer.ts'

describe('schema pointers', () => {
    test('escapes and unescapes a segment', () => {
        expect(escapePointer('a/b~c')).toBe('a~1b~0c')
        expect(unescapePointer('a~1b~0c')).toBe('a/b~c')
        expect(unescapePointer('~01')).toBe('~1')
    })

    test('points at a field of the schema at a holder', () => {
        expect(pointerFor('', 'unit')).toBe('/properties/unit')
        expect(pointerFor('/properties/sensor', 'a/b')).toBe('/properties/sensor/properties/a~1b')
    })

    test('tells an object from an array, null and a scalar', () => {
        expect(isObject({})).toBe(true)
        expect(isObject([])).toBe(false)
        expect(isObject(null)).toBe(false)
        expect(isObject('x')).toBe(false)
    })
})
