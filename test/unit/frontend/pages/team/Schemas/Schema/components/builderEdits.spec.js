import { describe, expect, test } from 'vitest'

import { addField, applyForm, deleteField, formFor, formProblem, moveField, nestedPaths, removeField, restoreField, setOtherFieldsAllowed } from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/builderEdits.ts'

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

    test('wants numbers as the allowed values of a number, and whole numbers for an integer', () => {
        expect(problem('/properties/value', { allowedValues: ['1', 'two'] })).toBe('Allowed values must be numbers.')
        expect(problem('/properties/value', { type: 'integer', allowedValues: ['1.5'] })).toBe('Allowed values must be whole numbers.')
        expect(problem('/properties/value', { type: 'integer', allowedValues: ['1', '2'] })).toBe('')
    })

    test('ignores limits the type does not show', () => {
        expect(problem('/properties/unit', { type: 'boolean', minLength: 'x' })).toBe('')
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

    test('moves a field among the fields of its object, staying put at either end', () => {
        expect(Object.keys(moveField(SCHEMA(), '/properties/unit', -1).properties)).toEqual(['unit', 'value', 'fault_code', 'sensor', 'tags'])
        expect(Object.keys(moveField(SCHEMA(), '/properties/unit', 1).properties)).toEqual(['value', 'fault_code', 'unit', 'sensor', 'tags'])
        expect(Object.keys(moveField(SCHEMA(), '/properties/value', -1).properties)).toEqual(['value', 'unit', 'fault_code', 'sensor', 'tags'])
    })

    test('deletes a field, taking it off the required list', () => {
        const root = deleteField(SCHEMA(), '/properties/value')
        expect(root.properties).not.toHaveProperty('value')
        expect(root.required).toEqual(['unit'])
        expect(deleteField(SCHEMA(), '/properties/sensor/properties/id').properties.sensor).toEqual({ type: 'object', properties: {} })
    })

    test('lists the fields inside a field, at any depth', () => {
        const root = { type: 'object', properties: { location: { type: 'object', properties: { site: { type: 'string' }, cell: { type: 'object', properties: { id: {} } }, readings: { type: 'array', items: { type: 'object', properties: { at: {} } } } } } } }
        expect(nestedPaths(root, '/properties/location', '/location')).toEqual(['/location/site', '/location/cell', '/location/cell/id', '/location/readings', '/location/readings/at'])
        expect(nestedPaths(root, '/properties/location/properties/site', '/location/site')).toEqual([])
    })

    test('restores a deleted field as the published version has it, in its place and on the required list', () => {
        const published = { type: 'object', required: ['serial'], properties: { value: { type: 'number' }, serial: { type: 'string', minLength: 4 }, unit: { type: 'string' } } }
        const draft = { type: 'object', properties: { value: { type: 'number' }, unit: { type: 'string' } } }
        const root = restoreField(draft, published, '/properties/serial')
        expect(Object.keys(root.properties)).toEqual(['value', 'serial', 'unit'])
        expect(root.properties.serial).toEqual({ type: 'string', minLength: 4 })
        expect(root.required).toEqual(['serial'])
    })

    test('deleting and restoring a field gives back the published schema', () => {
        const published = SCHEMA()
        for (const name of ['value', 'unit']) {
            const restored = restoreField(deleteField(published, `/properties/${name}`), published, `/properties/${name}`)
            expect(JSON.stringify(restored)).toEqual(JSON.stringify(published))
        }
    })
})
