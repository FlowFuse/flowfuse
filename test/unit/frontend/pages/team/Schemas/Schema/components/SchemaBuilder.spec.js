import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

import SchemaBuilder from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/SchemaBuilder.vue'

const SCHEMA = { type: 'object', required: ['location'], properties: { location: { type: 'object', properties: { site: { type: 'string' } } }, calibration: { anyOf: [{ type: 'number' }] } }, additionalProperties: false }

function mountBuilder (schemaText = JSON.stringify(SCHEMA)) {
    return mount(SchemaBuilder, {
        props: { schemaText },
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

    test('says so when the schema has no fields', () => {
        expect(mountBuilder('{"type": "object"}').find('[data-el="builder-no-fields"]').exists()).toBe(true)
    })
})
