import { describe, expect, test } from 'vitest'

import { addField, applyForm, deleteField, formFor, formProblem, moveField, nestedPaths, restoreField, setOtherFieldsAllowed } from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/builderEdits.ts'

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

const edit = (pointer, changes, root = SCHEMA()) => applyForm(root, pointer, { ...formFor(root, pointer), ...changes })

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
        expect(formProblem(SCHEMA(), '/properties/unit', { ...formFor(SCHEMA(), '/properties/unit'), pattern: '(' })).toBe('The pattern is not a valid regular expression.')
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
