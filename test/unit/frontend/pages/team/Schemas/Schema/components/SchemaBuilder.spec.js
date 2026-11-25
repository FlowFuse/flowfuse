import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

import SchemaBuilder from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/SchemaBuilder.vue'
import { parseSchema } from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/builder.ts'

const SCHEMA = { type: 'object', required: ['location'], properties: { location: { type: 'object', properties: { site: { type: 'string' } } }, calibration: { anyOf: [{ type: 'number' }] } }, additionalProperties: false }

function mountBuilder (text = JSON.stringify(SCHEMA)) {
    return mount(SchemaBuilder, {
        props: { schema: parseSchema(text) },
        global: {
            stubs: {
                'ff-data-table': { template: '<table><tbody><slot name="rows" /></tbody></table>' },
                'ff-data-table-row': { template: '<tr><slot /></tr>' },
                'ff-data-table-cell': { template: '<td><slot /></td>' },
                'ff-button': { template: '<button><slot /></button>' }
            }
        }
    })
}

const paths = (builder) => builder.findAll('[data-el^="builder-row-"]').map(row => row.attributes('data-el').replace('builder-row-', ''))

describe('Schema builder', () => {
    test('expands and collapses an object', async () => {
        const builder = mountBuilder()
        expect(paths(builder)).toEqual(['/location', '/calibration'])
        await builder.find('[data-action="builder-toggle"]').trigger('click')
        expect(paths(builder)).toEqual(['/location', '/location/site', '/calibration'])
        await builder.find('[data-action="builder-toggle"]').trigger('click')
        expect(paths(builder)).toEqual(['/location', '/calibration'])
    })

    test('sends a field it cannot show to the JSON view', async () => {
        const builder = mountBuilder()
        await builder.find('[data-action="builder-edit-in-json"]').trigger('click')
        expect(builder.emitted('edit-json')).toHaveLength(1)
    })

    test('shows whether fields the schema does not list are allowed', () => {
        const builder = mountBuilder()
        expect(builder.find('[data-el="builder-other-fields"]').text()).toContain('Not allowed (additionalProperties: false)')
    })

    test('says nothing about other fields when the message is not an object', () => {
        expect(mountBuilder('{"type": "array"}').find('[data-el="builder-other-fields"]').exists()).toBe(false)
    })

    test('asks for the JSON to be fixed when it is not a schema object', async () => {
        const builder = mountBuilder('{"type": ')
        expect(builder.find('[data-el="builder-blocked"]').exists()).toBe(true)
        await builder.find('[data-action="builder-to-json"]').trigger('click')
        expect(builder.emitted('edit-json')).toHaveLength(1)
    })

    test('opens fields deeper than three levels in a view of their own, with a trail back', async () => {
        const deep = { type: 'object', properties: { a: { type: 'object', properties: { b: { type: 'object', properties: { c: { type: 'object', properties: { d: { type: 'string' } } } } } } } } }
        const builder = mountBuilder(JSON.stringify(deep))
        await builder.find('[data-el="builder-row-/a"] [data-action="builder-toggle"]').trigger('click')
        await builder.find('[data-el="builder-row-/a/b"] [data-action="builder-toggle"]').trigger('click')
        expect(builder.find('[data-el="builder-row-/a/b/c"] [data-action="builder-toggle"]').exists()).toBe(false)
        await builder.find('[data-el="builder-row-/a/b/c"] [data-action="builder-drill-in"]').trigger('click')
        expect(paths(builder)).toEqual(['/a/b/c/d'])
        expect(builder.find('[data-el="builder-trail"]').text()).toBe('All fieldsabc')
        await builder.find('[data-action="builder-trail-step"]').trigger('click')
        expect(paths(builder)).toEqual(['/a/b', '/a/b/c'])
        await builder.find('[data-action="builder-trail-root"]').trigger('click')
        expect(paths(builder)[0]).toBe('/a')
        expect(builder.find('[data-el="builder-trail"]').exists()).toBe(false)
    })

    test('shows the error of a field using a reference, with a way to the JSON', async () => {
        const builder = mountBuilder('{"type": "object", "properties": {"a": {"$ref": "#/$defs/a"}}}')
        expect(builder.find('[data-el="builder-row-problem"]').text()).toBe('$ref is not supported yet')
        await builder.find('[data-action="builder-edit-in-json"]').trigger('click')
        expect(builder.emitted('edit-json')).toHaveLength(1)
    })

    test('reads the other fields setting from the object drilled into', async () => {
        const nested = { type: 'object', properties: { a: { type: 'object', properties: { b: { type: 'object', properties: { c: { type: 'object', additionalProperties: { type: 'string' }, properties: { d: { type: 'string' } } } } } } } } }
        const builder = mountBuilder(JSON.stringify(nested))
        await builder.find('[data-el="builder-row-/a"] [data-action="builder-toggle"]').trigger('click')
        await builder.find('[data-el="builder-row-/a/b"] [data-action="builder-toggle"]').trigger('click')
        expect(builder.find('[data-el="builder-other-fields"]').text()).toContain('Allowed (additionalProperties: true)')
        await builder.find('[data-el="builder-row-/a/b/c"] [data-action="builder-drill-in"]').trigger('click')
        expect(builder.find('[data-el="builder-other-fields"]').text()).toContain('checked against the schema')
    })

    test('goes back to the whole message when the field drilled into goes away', async () => {
        const nested = { type: 'object', properties: { a: { type: 'object', properties: { b: { type: 'object', properties: { c: { type: 'object', properties: { d: { type: 'string' } } } } } } } } }
        const builder = mountBuilder(JSON.stringify(nested))
        await builder.find('[data-el="builder-row-/a"] [data-action="builder-toggle"]').trigger('click')
        await builder.find('[data-el="builder-row-/a/b"] [data-action="builder-toggle"]').trigger('click')
        await builder.find('[data-el="builder-row-/a/b/c"] [data-action="builder-drill-in"]').trigger('click')
        await builder.setProps({ schema: parseSchema('{"type": "object", "properties": {"x": {"type": "string"}}}') })
        expect(paths(builder)).toEqual(['/x'])
        expect(builder.find('[data-el="builder-trail"]').exists()).toBe(false)
    })

    test('says so when the schema has no fields', () => {
        expect(mountBuilder('{"type": "object"}').find('[data-el="builder-no-fields"]').exists()).toBe(true)
    })
})
