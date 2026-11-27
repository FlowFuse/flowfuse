import { describe, expect, test } from 'vitest'

import { defaultPair, fieldPath, formatValue, withoutId } from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/compare.ts'

const DRAFT = { version: null, status: 'draft' }
const V3 = { version: '1.2.0', status: 'published' }
const V2 = { version: '1.1.0', status: 'deprecated' }
const V1 = { version: '1.0.0', status: 'published' }

describe('schema compare helpers', () => {
    test('reads a pointer as a path through the fields', () => {
        expect(fieldPath('/properties/sensor/properties/id/pattern')).toBe('/sensor/id/pattern')
        expect(fieldPath('/required')).toBe('/required')
        expect(fieldPath('/properties/tags/items/properties/name')).toBe('/tags/items/name')
        expect(fieldPath('/properties/properties/type')).toBe('/properties/type')
        expect(fieldPath('/properties/unit/enum/0')).toBe('/unit/enum/0')
        expect(fieldPath('/properties/a~1b')).toBe('/a/b')
    })

    test('shows a value on one line, strings as they are', () => {
        expect(formatValue('SenML unit')).toBe('SenML unit')
        expect(formatValue(['value', 'unit'])).toBe('["value","unit"]')
        expect(formatValue({ type: 'boolean' })).toBe('{"type":"boolean"}')
        expect(formatValue(200)).toBe('200')
        expect(formatValue(undefined)).toBe('')
    })

    test('leaves the version $id out of the JSON diff', () => {
        expect(withoutId({ $id: 'urn:x:1.0.0', type: 'object' })).toEqual({ type: 'object' })
    })

    describe('versions picked by default', () => {
        test('from the version asked for to the draft', () => {
            expect(defaultPair([DRAFT, V3, V2, V1], '1.0.0')).toEqual({ from: '1.0.0', to: 'draft' })
        })

        test('from the latest published to the draft when nothing is asked for', () => {
            expect(defaultPair([DRAFT, V3, V2, V1])).toEqual({ from: '1.2.0', to: 'draft' })
        })

        test('the latest published with the one before it when there is no draft', () => {
            expect(defaultPair([V3, V2, V1], '1.2.0')).toEqual({ from: '1.1.0', to: '1.2.0' })
            expect(defaultPair([V3, V2, V1], '1.0.0')).toEqual({ from: '1.0.0', to: '1.2.0' })
        })

        test('keeps both versions in the address, and ignores ones the schema does not have', () => {
            expect(defaultPair([DRAFT, V3, V2, V1], '1.0.0', '1.1.0')).toEqual({ from: '1.0.0', to: '1.1.0' })
            expect(defaultPair([DRAFT, V3, V2, V1], '9.9.9', 'nope')).toEqual({ from: '1.2.0', to: 'draft' })
        })

        test('keeps a version picked on both sides', () => {
            expect(defaultPair([V3, V2, V1], '1.0.0', '1.0.0')).toEqual({ from: '1.0.0', to: '1.0.0' })
        })

        test('takes the draft as the version compared to only', () => {
            expect(defaultPair([DRAFT, V3, V2, V1], 'draft', '1.1.0')).toEqual({ from: '1.2.0', to: '1.1.0' })
            expect(defaultPair([DRAFT, V3, V2, V1], 'draft')).toEqual({ from: '1.2.0', to: 'draft' })
        })

        test('needs two versions', () => {
            expect(defaultPair([V1])).toBeNull()
            expect(defaultPair([])).toBeNull()
        })
    })
})
