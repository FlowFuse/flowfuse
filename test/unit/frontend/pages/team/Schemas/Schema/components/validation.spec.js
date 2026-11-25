import { describe, expect, test } from 'vitest'

import { validatePayload } from '../../../../../../../../forge/ee/lib/schemas/document.js'
import { typeLabel } from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/schemaTypes.ts'
import { exampleFromSchema, sampleForPattern, validationRows } from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/validation.ts'

const SCHEMA = {
    type: 'object',
    required: ['value', 'unit'],
    properties: {
        value: { type: 'number', minimum: -50, maximum: 200 },
        unit: { type: 'string', enum: ['Cel', 'degF'] },
        fault_code: { type: ['string', 'null'] },
        sensor: { type: 'object', required: ['id'], properties: { id: { type: 'string', pattern: '^TS-\\d{4}$' }, line: { type: 'integer', minimum: 1 } } },
        tags: { type: 'array', items: { type: 'string' }, uniqueItems: true },
        calibration: { oneOf: [{ type: 'object', required: ['offset'], properties: { offset: { type: 'number' } } }, { type: 'null' }] }
    }
}

const rowsFor = (schema, payload) => validationRows(schema, payload, validatePayload(schema, payload).errors)
const summary = (rows) => rows.map(row => [row.path, row.result, row.message])

describe('validation rows', () => {
    test('passes every field the message has, and says which optional ones it leaves out', () => {
        expect(summary(rowsFor(SCHEMA, { value: 21.4, unit: 'Cel', sensor: { id: 'TS-0042' } }))).toEqual([
            ['/value', 'pass', 'Passes'],
            ['/unit', 'pass', 'Passes'],
            ['/fault_code', 'optional', 'Not present (optional)'],
            ['/sensor', 'pass', 'Passes'],
            ['/sensor/id', 'pass', 'Passes'],
            ['/sensor/line', 'optional', 'Not present (optional)'],
            ['/tags', 'optional', 'Not present (optional)'],
            ['/calibration', 'optional', 'Not present (optional)']
        ])
    })

    test('puts each error on its field, a missing required one included', () => {
        const rows = rowsFor(SCHEMA, { value: 250, sensor: { id: 'T-42', line: 0 }, tags: ['a', 'a'] })
        const failed = rows.filter(row => row.result === 'fail').map(row => [row.path, row.message])
        expect(failed).toEqual([
            ['/value', 'must be <= 200'],
            ['/unit', 'must have required property \'unit\''],
            ['/sensor/id', 'must match pattern "^TS-\\d{4}$"'],
            ['/sensor/line', 'must be >= 1'],
            ['/tags', 'must NOT have duplicate items (items ## 1 and 0 are identical)']
        ])
        expect(rows.find(row => row.path === '/unit')).toMatchObject({ present: false, value: 'missing' })
    })

    test('says what is allowed when the message has something else', () => {
        const rows = rowsFor(SCHEMA, { value: 'hot', unit: 'kelvin', fault_code: 42 })
        const messages = Object.fromEntries(rows.filter(row => row.result === 'fail').map(row => [row.path, row.message]))
        expect(messages).toEqual({
            '/value': 'must be number',
            '/unit': 'must be one of "Cel" or "degF"',
            '/fault_code': 'must be string or null'
        })
    })

    test('shows a oneOf failure once, with the oneOf message', () => {
        const row = rowsFor(SCHEMA, { value: 1, unit: 'Cel', calibration: { offset: 'x' } }).find(row => row.path === '/calibration')
        expect([row.result, row.message, row.type]).toEqual(['fail', 'must match exactly one schema in oneOf', 'oneOf (2)'])
    })

    test('lists fields the schema does not have, failing them when the schema allows no others', () => {
        expect(summary(rowsFor(SCHEMA, { value: 1, unit: 'Cel', temp_f: 78.5 })).at(-1)).toEqual(['/temp_f', 'extra', 'Not in schema (additionalProperties: true)'])
        const closed = { ...SCHEMA, additionalProperties: false }
        expect(summary(rowsFor(closed, { value: 1, unit: 'Cel', temp_f: 78.5 })).at(-1)).toEqual(['/temp_f', 'fail', 'must NOT have additional properties'])
    })

    test('says what decides a field the schema does not list', () => {
        const schema = { type: 'object', properties: {}, patternProperties: { '^x-': { type: 'string' } }, additionalProperties: { type: 'number' } }
        expect(summary(rowsFor(schema, { 'x-a': 'ok', other: 1 }))).toEqual([
            ['/x-a', 'extra', 'Checked by patternProperties'],
            ['/other', 'extra', 'Checked by the additionalProperties schema']
        ])
    })

    test('keeps the index and field of an error inside an array item', () => {
        const schema = { type: 'object', properties: { readings: { type: 'array', items: { type: 'object', properties: { value: { type: 'number' } } } } } }
        expect(summary(rowsFor(schema, { readings: [{ value: 1 }, { value: 'x' }] }))).toEqual([['/readings', 'fail', '/1/value: must be number']])
    })

    test('has no rows for a message that passes a schema with no fields', () => {
        expect(rowsFor({ type: 'object' }, {})).toEqual([])
    })

    test('does not fail a missing field on its own', () => {
        expect(summary(validationRows(SCHEMA, { value: 1 }, []))).toContainEqual(['/unit', 'optional', 'Not present (optional)'])
    })

    test('leaves out the fields of an object the message does not have', () => {
        expect(rowsFor(SCHEMA, { value: 1, unit: 'Cel' }).some(row => row.path.startsWith('/sensor/'))).toBe(false)
    })

    test('gives the message a row of its own when it fails as a whole', () => {
        expect(summary(rowsFor(SCHEMA, [1, 2]))).toEqual([['/', 'fail', 'must be object']])
        expect(summary(rowsFor({ type: 'string' }, 'hi'))).toEqual([['/', 'pass', 'Passes']])
    })

    test('labels types the way the builder writes them', () => {
        expect(typeLabel({ type: ['string', 'null'] })).toBe('string | null')
        expect(typeLabel({ type: 'array', items: { type: 'string' } })).toBe('array of string')
        expect(typeLabel({ anyOf: [{}, {}, {}] })).toBe('anyOf (3)')
    })
})

describe('example from the schema', () => {
    const FIXTURES = {
        'every type and constraint': SCHEMA,
        formats: { type: 'object', required: ['at', 'day', 'mail', 'link', 'id'], properties: { at: { type: 'string', format: 'date-time' }, day: { type: 'string', format: 'date' }, mail: { type: 'string', format: 'email' }, link: { type: 'string', format: 'uri' }, id: { type: 'string', format: 'uuid' } } },
        bounds: { type: 'object', properties: { low: { type: 'integer', minimum: 5, maximum: 9 }, high: { type: 'number', maximum: -3 }, open: { type: 'number', exclusiveMinimum: 10 }, code: { type: 'string', minLength: 6 } } },
        'patterns with lengths': { type: 'object', properties: { code: { type: 'string', pattern: '^[a-z]{3}-\\d{2}$' } } },
        'arrays of objects': { type: 'array', minItems: 2, items: { type: 'object', required: ['id'], properties: { id: { type: 'string', pattern: '^[A-Z]{2}-\\d+$' } } } },
        'examples and defaults': { type: 'object', properties: { a: { type: 'string', examples: ['picked'] }, b: { type: 'number', default: 7 }, c: { const: 'fixed' } } },
        allOf: { allOf: [{ type: 'object', properties: { a: { type: 'string' } } }, { type: 'object', properties: { b: { type: 'boolean' } } }] }
    }

    for (const [name, schema] of Object.entries(FIXTURES)) {
        test(`passes its own schema: ${name}`, () => {
            const example = exampleFromSchema(schema)
            expect(validatePayload(schema, example)).toEqual({ valid: true, errors: [] })
        })
    }

    test('prefers examples, then the default, the const and the first allowed value', () => {
        expect(exampleFromSchema(FIXTURES['examples and defaults'])).toEqual({ a: 'picked', b: 7, c: 'fixed' })
        expect(exampleFromSchema({ type: 'string', enum: ['Cel', 'degF'] })).toBe('Cel')
    })

    test('follows simple patterns and gives up on involved ones', () => {
        expect(sampleForPattern('^TS-\\d{4}$')).toBe('TS-0000')
        expect(sampleForPattern('^[A-Z]{2}-\\d+$')).toBe('AA-0')
        expect(sampleForPattern('^a?b*c$')).toBe('c')
        expect(sampleForPattern('^(a|b)$')).toBeUndefined()
        expect(sampleForPattern('^[^x]$')).toBeUndefined()
    })
})
