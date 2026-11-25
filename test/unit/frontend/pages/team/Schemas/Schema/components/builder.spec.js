import { describe, expect, test } from 'vitest'

import { builderRows, constraintsSummary, fieldTrail, otherFields, parseSchema, referenceProblem, schemaAt } from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/builder.ts'
import { typeLabel } from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/schemaTypes.ts'

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
        expect(typeLabel({ const: 1 })).toBe('const')
    })

    test('allows fields the schema does not list unless it says otherwise', () => {
        expect(otherFields({ type: 'object' })).toBe('allowed')
        expect(otherFields({ type: 'object', additionalProperties: true })).toBe('allowed')
        expect(otherFields({ type: 'object', additionalProperties: false })).toBe('none')
        expect(otherFields({ type: 'object', additionalProperties: { type: 'string' } })).toBe('schema')
    })

    test('shows a tuple of items read-only', () => {
        const root = { type: 'object', properties: { pair: { type: 'array', items: [{ type: 'string' }, { type: 'number' }] } } }
        expect(builderRows(root, new Set())[0]).toMatchObject({ jsonOnly: true, children: null, constraints: 'Not editable in the builder' })
    })

    test('reports a reference keyword on a field, on its items and on the root', () => {
        const root = { type: 'object', properties: { a: { $ref: '#/$defs/a' }, b: { type: 'array', items: { $dynamicRef: '#x' } }, c: { type: 'string' } } }
        const rows = builderRows(root, new Set())
        expect(rows.map(row => [row.path, row.problem, row.jsonOnly])).toEqual([['/a', '$ref is not supported yet', true], ['/b', '$dynamicRef is not supported yet', true], ['/c', '', false]])
        expect(rows[0].constraints).toBe('$ref is not supported yet')
        expect(builderRows({ $ref: '#' }, new Set())[0]).toMatchObject({ path: '/', problem: '$ref is not supported yet', jsonOnly: true })
        expect(referenceProblem({ $id: 'urn:x' }, true)).toBe('')
        expect(referenceProblem({ $id: 'urn:x' })).toBe('$id is not supported yet')
    })

    test('copes with a required that is not a list', () => {
        const rows = builderRows({ type: 'object', required: 'a', properties: { a: { type: 'string' } } }, new Set())
        expect(rows[0].required).toBe(false)
    })

    test('finds a schema by pointer, or nothing', () => {
        const root = { type: 'object', properties: { 'a/b': { type: 'string' } } }
        expect(schemaAt(root, '/properties/a~1b')).toEqual({ type: 'string' })
        expect(schemaAt(root, '/properties/toString')).toBeUndefined()
        expect(schemaAt(root, '/properties/missing/properties/x')).toBeUndefined()
        expect(schemaAt(root, '')).toBe(root)
    })

    test('parses only a schema object', () => {
        expect(parseSchema('{"type": "string"}')).toEqual({ type: 'string' })
        expect(parseSchema('[]')).toBeNull()
        expect(parseSchema('{"type": ')).toBeNull()
    })

    describe('deep nesting', () => {
        const DEEP = { type: 'object', properties: { a: { type: 'object', properties: { b: { type: 'object', properties: { c: { type: 'object', properties: { d: { type: 'object', properties: { e: { type: 'string' } } } } } } } } } } }
        const ALL = new Set(['/properties/a', '/properties/a/properties/b', '/properties/a/properties/b/properties/c'])

        test('shows three levels indented, and opens deeper fields in a view of their own', () => {
            const rows = builderRows(DEEP, ALL)
            expect(rows.map(row => [row.path, row.depth, row.expanded, row.drillIn])).toEqual([['/a', 0, true, false], ['/a/b', 1, true, false], ['/a/b/c', 2, false, true]])
        })

        test('lists the fields of the field drilled into, with the same limit from there', () => {
            const rows = builderRows(DEEP, new Set(['/properties/a/properties/b/properties/c/properties/d']), '/properties/a/properties/b/properties/c')
            expect(rows.map(row => [row.path, row.depth, row.pointer])).toEqual([['/a/b/c/d', 0, '/properties/a/properties/b/properties/c/properties/d'], ['/a/b/c/d/e', 1, '/properties/a/properties/b/properties/c/properties/d/properties/e']])
        })

        test('drills into an array of objects through its items', () => {
            const root = { type: 'object', properties: { list: { type: 'array', items: { type: 'object', properties: { at: { type: 'string' } } } } } }
            expect(builderRows(root, new Set(), '/properties/list').map(row => [row.path, row.pointer])).toEqual([['/list/at', '/properties/list/items/properties/at']])
        })

        test('gives the trail to a field', () => {
            expect(fieldTrail('/properties/a/properties/list/items/properties/c')).toEqual([
                { name: 'a', pointer: '/properties/a', path: '/a' },
                { name: 'list', pointer: '/properties/a/properties/list', path: '/a/list' },
                { name: 'c', pointer: '/properties/a/properties/list/items/properties/c', path: '/a/list/c' }
            ])
            expect(fieldTrail('')).toEqual([])
        })
    })
})
