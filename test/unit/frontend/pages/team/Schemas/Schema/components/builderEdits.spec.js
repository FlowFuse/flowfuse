import { describe, expect, test } from 'vitest'

import { addField, allowedValuesFor, applyForm, formFor, formProblem, removeField, setOtherFieldsAllowed } from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/builderEdits.ts'

const SCHEMA = () => ({
    type: 'object',
    required: ['value', 'unit'],
    properties: {
        value: { type: 'number', minimum: -50, maximum: 200, description: 'Measured temperature', 'x-unit': 'Cel' },
        unit: { type: 'string', enum: ['Cel', 'degF'] },
        fault_code: { type: ['string', 'null'] },
        sensor: { type: 'object', required: ['id'], properties: { id: { type: 'string', pattern: '^TS-\\d{4}$' } } },
        tags: { type: 'array', items: { type: 'string' }, uniqueItems: true }
    },
    additionalProperties: false
})

const apply = (pointer, changes, root = SCHEMA()) => applyForm(root, pointer, { ...formFor(root, pointer), ...changes })
const edit = (pointer, changes, root = SCHEMA()) => apply(pointer, changes, root).root
const problem = (pointer, changes) => formProblem(SCHEMA(), pointer, { ...formFor(SCHEMA(), pointer), ...changes })

describe('builder edits', () => {
    test('reads a field into the form', () => {
        expect(formFor(SCHEMA(), '/properties/value')).toMatchObject({ name: 'value', type: 'number', nullable: false, required: true, description: 'Measured temperature', minimum: '-50', maximum: '200' })
        expect(formFor(SCHEMA(), '/properties/fault_code')).toMatchObject({ type: 'string', nullable: true, required: false })
        expect(formFor(SCHEMA(), '/properties/unit').allowedValues).toEqual(['Cel', 'degF'])
        expect(formFor(SCHEMA(), '/properties/tags')).toMatchObject({ type: 'array', itemType: 'string', uniqueItems: true })
        expect(formFor(SCHEMA(), '/properties/sensor/properties/id')).toMatchObject({ required: true, pattern: '^TS-\\d{4}$' })
    })

    describe('a field opened and applied without a change', () => {
        const untouched = (field) => {
            const root = { type: 'object', required: [], properties: { f: structuredClone(field) } }
            return applyForm(root, '/properties/f', formFor(root, '/properties/f')).root
        }
        test.each([
            ['lists fields without stating a type', { properties: { a: { type: 'string' } }, required: ['a'] }],
            ['states no type and has a limit', { minimum: 0, description: 'x' }],
            ['states no type and allows values of several types', { enum: [1, 'a', true] }],
            ['may be null and allows values without null among them', { type: ['string', 'null'], enum: ['a'] }],
            ['is an object that lists no fields', { type: 'object' }],
            ['has keywords the form does not cover', { type: 'number', multipleOf: 5, exclusiveMinimum: 0, default: 5, 'x-custom': 1 }]
        ])('stays as it was when it %s', (_, field) => {
            const root = untouched(field)
            expect(root.properties.f).toEqual(field)
            // an empty required list is not removed either
            expect(root.required).toEqual([])
        })
    })

    test('shows a field that states no type as taking any, or as an object when it lists fields', () => {
        const root = { type: 'object', properties: { any: { minimum: 0 }, shape: { properties: { w: {} } } } }
        expect(formFor(root, '/properties/any').type).toBe('any')
        expect(formFor(root, '/properties/shape').type).toBe('object')
    })

    test('writes only what was changed on a field that states no type, and gives it one when asked', () => {
        const root = { type: 'object', properties: { any: { minimum: 0, enum: [1, 'a'] } } }
        expect(edit('/properties/any', { description: 'Anything' }, root).properties.any).toEqual({ minimum: 0, enum: [1, 'a'], description: 'Anything' })
        expect(edit('/properties/any', { type: 'number', allowedValues: [] }, root).properties.any).toEqual({ minimum: 0, type: 'number' })
    })

    test('renames a field in place, in the required list too, keeping keywords the form does not cover', () => {
        const root = edit('/properties/value', { name: 'reading' })
        expect(Object.keys(root.properties)).toEqual(['reading', 'unit', 'fault_code', 'sensor', 'tags'])
        expect(root.required).toEqual(['reading', 'unit'])
        expect(root.properties.reading['x-unit']).toBe('Cel')
        expect(root.additionalProperties).toBe(false)
        expect(apply('/properties/value', { name: 'a/b' }).pointer).toBe('/properties/a~1b')
    })

    test('adds a field to the required list and takes it off', () => {
        expect(edit('/properties/tags', { required: true }).required).toEqual(['value', 'unit', 'tags'])
        expect(edit('/properties/sensor/properties/id', { required: false }).properties.sensor).not.toHaveProperty('required')
    })

    test('drops the constraints the new type does not take', () => {
        const root = edit('/properties/value', { type: 'string' })
        expect(root.properties.value).toEqual({ type: 'string', description: 'Measured temperature', 'x-unit': 'Cel' })
    })

    test('allows null alongside the type, and stops allowing it', () => {
        expect(edit('/properties/unit', { nullable: true }).properties.unit.type).toEqual(['string', 'null'])
        expect(edit('/properties/fault_code', { nullable: false }).properties.fault_code.type).toBe('string')
    })

    test('sets the item type of an array, and starts an object with no fields', () => {
        expect(edit('/properties/tags', { itemType: 'integer' }).properties.tags.items).toEqual({ type: 'integer' })
        expect(edit('/properties/unit', { type: 'object' }).properties.unit).toEqual({ type: 'object', properties: {} })
    })

    test('writes the constraints as their types, and leaves out empty ones', () => {
        const root = edit('/properties/value', { minimum: '', maximum: '10', allowedValues: ['1', '2.5'], description: '' })
        expect(root.properties.value).toEqual({ type: 'number', maximum: 10, enum: [1, 2.5], 'x-unit': 'Cel' })
        const text = edit('/properties/unit', { minLength: '2', pattern: '^[a-z]+$', format: 'email', allowedValues: [] })
        expect(text.properties.unit).toEqual({ type: 'string', minLength: 2, pattern: '^[a-z]+$', format: 'email' })
    })

    test('says what stops a field being saved', () => {
        const form = formFor(SCHEMA(), '/properties/value')
        expect(formProblem(SCHEMA(), '/properties/value', form)).toBe('')
        expect(formProblem(SCHEMA(), '/properties/value', { ...form, name: ' ' })).toBe('A field needs a name.')
        expect(formProblem(SCHEMA(), '/properties/value', { ...form, name: 'unit' })).toBe('There is already a field called unit here.')
        expect(formProblem(SCHEMA(), '/properties/value', { ...form, minimum: 'low' })).toBe('minimum must be a number.')
        expect(formProblem(SCHEMA(), '/properties/unit', { ...formFor(SCHEMA(), '/properties/unit'), minLength: '1.5' })).toBe('minLength must be a whole number of 0 or more.')
        expect(problem('/properties/unit', { pattern: '(' })).toMatch('not a valid regular expression')
    })

    test('refuses a pattern the backend refuses', () => {
        expect(problem('/properties/unit', { pattern: '^[a-z]+$' })).toBe('')
        expect(problem('/properties/unit', { pattern: '(?=a)' })).toMatch('not a valid regular expression')
        expect(problem('/properties/unit', { pattern: '(a)\\1' })).toMatch('not a valid regular expression')
    })

    test('reports a minimum above the maximum', () => {
        expect(problem('/properties/value', { minimum: '10', maximum: '2' })).toBe('minimum must not be more than maximum.')
        expect(problem('/properties/unit', { minLength: '5', maxLength: '2' })).toBe('minLength must not be more than maxLength.')
        expect(problem('/properties/tags', { minItems: '3', maxItems: '1' })).toBe('minItems must not be more than maxItems.')
    })

    test('keeps the allowed values a type can have', () => {
        expect(allowedValuesFor('number', ['1.5', 'abc', '2'])).toEqual(['1.5', '2'])
        expect(allowedValuesFor('integer', ['1.5', 'abc', '2'])).toEqual(['2'])
        expect(allowedValuesFor('string', ['1.5', 'abc'])).toEqual(['1.5', 'abc'])
    })

    test('wants numbers as the allowed values of a number, and whole numbers for an integer', () => {
        expect(problem('/properties/value', { allowedValues: ['1', 'two'] })).toBe('Allowed values must be numbers.')
        expect(problem('/properties/value', { type: 'integer', allowedValues: ['1.5'] })).toBe('Allowed values must be whole numbers.')
        expect(problem('/properties/value', { type: 'integer', allowedValues: ['1', '2'] })).toBe('')
    })

    test('ignores limits the type does not show', () => {
        expect(problem('/properties/unit', { type: 'boolean', minLength: 'x' })).toBe('')
    })

    test('keeps allowed values of other types when only null is allowed or stopped', () => {
        const root = { type: 'object', properties: { code: { type: 'string', enum: ['a', 1] } } }
        const allowed = applyForm(root, '/properties/code', { ...formFor(root, '/properties/code'), nullable: true }).root
        expect(allowed.properties.code.enum).toEqual(['a', 1, null])
        const stopped = applyForm(allowed, '/properties/code', { ...formFor(allowed, '/properties/code'), nullable: false }).root
        expect(stopped.properties.code).toEqual({ type: 'string', enum: ['a', 1] })
    })

    test('adds null to the allowed values of a field that may be null', () => {
        expect(edit('/properties/unit', { nullable: true }).properties.unit.enum).toEqual(['Cel', 'degF', null])
        expect(edit('/properties/fault_code', { allowedValues: [] }).properties.fault_code).not.toHaveProperty('enum')
    })

    test('drops the keywords a type change leaves without', () => {
        const root = SCHEMA()
        Object.assign(root.properties.value, { exclusiveMinimum: 0, exclusiveMaximum: 9, multipleOf: 2 })
        Object.assign(root.properties.sensor, { minProperties: 1, maxProperties: 3 })
        expect(edit('/properties/value', { minimum: '1' }, root).properties.value).toMatchObject({ exclusiveMinimum: 0, exclusiveMaximum: 9, multipleOf: 2 })
        expect(edit('/properties/value', { type: 'string' }, root).properties.value).toEqual({ type: 'string', description: 'Measured temperature', 'x-unit': 'Cel' })
        expect(edit('/properties/sensor', { type: 'string' }, root).properties.sensor).toEqual({ type: 'string' })
    })

    test('does not give an array without items an items schema', () => {
        const root = { type: 'object', properties: { list: { type: 'array' } } }
        expect(edit('/properties/list', { description: 'x' }, root).properties.list).toEqual({ type: 'array', description: 'x' })
        expect(edit('/properties/list', { itemType: 'string' }, root).properties.list.items).toEqual({ type: 'string' })
    })

    test('keeps an additionalProperties schema unless the checkbox is changed', () => {
        const root = { type: 'object', properties: { extra: { type: 'object', additionalProperties: { type: 'string' } } } }
        expect(edit('/properties/extra', { description: 'x' }, root).properties.extra.additionalProperties).toEqual({ type: 'string' })
        expect(edit('/properties/extra', { otherFields: true }, root).properties.extra.additionalProperties).toEqual({ type: 'string' })
        expect(edit('/properties/extra', { otherFields: false }, root).properties.extra.additionalProperties).toBe(false)
        expect(setOtherFieldsAllowed(root, '/properties/extra', true).properties.extra.additionalProperties).toEqual({ type: 'string' })
    })

    test('lets an object refuse fields it does not list, or allow them again', () => {
        expect(edit('/properties/sensor', { otherFields: false }).properties.sensor.additionalProperties).toBe(false)
        const root = SCHEMA()
        root.properties.sensor.additionalProperties = false
        expect(edit('/properties/sensor', { otherFields: true }, root).properties.sensor).not.toHaveProperty('additionalProperties')
    })

    test('removes a field', () => {
        expect(Object.keys(removeField(SCHEMA(), '/properties/sensor').properties)).toEqual(['value', 'unit', 'fault_code', 'tags'])
    })

    test('adds a string field with a name not taken yet', () => {
        const first = addField(SCHEMA(), '/properties/sensor')
        expect(first.pointer).toBe('/properties/sensor/properties/new_field')
        const second = addField(first.root, '/properties/sensor')
        expect(Object.keys(second.root.properties.sensor.properties)).toEqual(['id', 'new_field', 'new_field_2'])
        expect(second.root.properties.sensor.properties.new_field_2).toEqual({ type: 'string' })
    })

    test('allows fields an object does not list by leaving the keyword out, as that is the default', () => {
        expect(setOtherFieldsAllowed(SCHEMA(), '', true)).not.toHaveProperty('additionalProperties')
        expect(setOtherFieldsAllowed(SCHEMA(), '/properties/sensor', false).properties.sensor.additionalProperties).toBe(false)
    })
})
