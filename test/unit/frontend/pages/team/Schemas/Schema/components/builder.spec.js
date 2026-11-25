import { describe, expect, test } from 'vitest'

import { allowsOtherFields, builderRows, constraintsSummary, typeLabel } from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/builder.ts'

const SCHEMA = {
    type: 'object',
    required: ['value', 'unit', 'location'],
    properties: {
        value: { type: 'number', minimum: -50, maximum: 200, description: 'Measured temperature' },
        unit: { type: 'string', enum: ['Cel', 'degF'] },
        fault_code: { type: ['string', 'null'] },
        location: {
            type: 'object',
            required: ['site'],
            properties: {
                site: { type: 'string', minLength: 1 },
                cell: { type: 'object', properties: { id: { type: 'string', pattern: '^C-\\d+$' } } }
            }
        },
        readings: { type: 'array', items: { type: 'object', properties: { at: { type: 'string', format: 'date-time' } } }, minItems: 1 },
        tags: { type: 'array', items: { type: 'string' }, uniqueItems: true },
        calibration: { oneOf: [{ type: 'number' }, { type: 'null' }] }
    }
}

const fields = (rows) => rows.map(row => [row.path, row.depth])

describe('builder rows', () => {
    test('lists the root fields with their type, required flag, constraints and description', () => {
        const rows = builderRows(SCHEMA, new Set())
        expect(fields(rows)).toEqual([['/value', 0], ['/unit', 0], ['/fault_code', 0], ['/location', 0], ['/readings', 0], ['/tags', 0], ['/calibration', 0]])
        expect(rows[0]).toMatchObject({ type: 'number', required: true, constraints: 'min -50 · max 200', description: 'Measured temperature', children: null })
        expect(rows[2]).toMatchObject({ type: 'string | null', required: false, constraints: 'None' })
        expect(rows[3]).toMatchObject({ children: 2, expanded: false, constraints: '2 fields' })
    })

    test('shows the fields of an expanded object, at any depth', () => {
        const rows = builderRows(SCHEMA, new Set(['/properties/location', '/properties/location/properties/cell']))
        expect(fields(rows).slice(3, 7)).toEqual([['/location', 0], ['/location/site', 1], ['/location/cell', 1], ['/location/cell/id', 2]])
        expect(rows[4]).toMatchObject({ required: true, pointer: '/properties/location/properties/site' })
    })

    test('shows the fields of an array of objects under it', () => {
        const rows = builderRows(SCHEMA, new Set(['/properties/readings']))
        const at = rows.find(row => row.path === '/readings/at')
        expect(at).toMatchObject({ depth: 1, pointer: '/properties/readings/items/properties/at', constraints: 'format date-time' })
        expect(rows.find(row => row.path === '/readings')).toMatchObject({ type: 'array of object', children: 1 })
    })

    test('shows a field using keywords the builder does not handle read-only', () => {
        const row = builderRows(SCHEMA, new Set()).find(row => row.path === '/calibration')
        expect(row).toMatchObject({ jsonOnly: true, type: 'oneOf (2)', constraints: 'Not editable in the builder', children: null })
    })

    test('gives a root that is not an object a single row', () => {
        expect(builderRows({ type: 'array', items: { type: 'number' } }, new Set())).toMatchObject([{ path: '/', type: 'array of number' }])
    })

    test('summarises every constraint the builder edits', () => {
        expect(constraintsSummary({ type: 'string', minLength: 2, maxLength: 9, pattern: '^a', format: 'email' })).toBe('min length 2 · max length 9 · pattern ^a · format email')
        expect(constraintsSummary({ type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3, uniqueItems: true })).toBe('min items 1 · max items 3 · unique items')
        expect(constraintsSummary({ type: 'object', properties: { a: {} } })).toBe('1 field')
    })

    test('labels types', () => {
        expect(typeLabel({ type: 'array', items: { type: ['string', 'null'] } })).toBe('array of string | null')
        expect(typeLabel({ properties: {} })).toBe('object')
        expect(typeLabel({})).toBe('any')
    })

    test('allows fields the schema does not list unless it says otherwise', () => {
        expect(allowsOtherFields({ type: 'object' })).toBe(true)
        expect(allowsOtherFields({ type: 'object', additionalProperties: false })).toBe(false)
    })
})
