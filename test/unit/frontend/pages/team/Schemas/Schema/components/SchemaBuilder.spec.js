import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import SchemaBuilder from '../../../../../../../../frontend/src/pages/team/Schemas/Schema/components/SchemaBuilder.vue'
import Dialog from '../../../../../../../../frontend/src/services/dialog.js'

vi.mock('../../../../../../../../frontend/src/services/dialog.js', () => ({ default: { showAsync: vi.fn() } }))

const SCHEMA = { type: 'object', required: ['location'], properties: { location: { type: 'object', properties: { site: { type: 'string' } } }, calibration: { anyOf: [{ type: 'number' }] } }, additionalProperties: false }

function mountBuilder (schemaText = JSON.stringify(SCHEMA), readOnly = true, published = null) {
    const builder = mount(SchemaBuilder, {
        props: { schemaText, readOnly, published, publishedVersion: '1.2.0', 'onUpdate:schemaText': (text) => builder.setProps({ schemaText: text }) },
        global: {
            stubs: {
                'ff-data-table': { template: '<table><tbody><slot name="rows" /></tbody></table>' },
                'ff-data-table-row': { template: '<tr><slot /></tr>' },
                'ff-data-table-cell': { template: '<td><slot /></td>' },
                'ff-button': { template: '<button><slot /></button>' },
                'ff-checkbox': { props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)">' },
                'ff-kebab-menu': { template: '<div><slot /></div>' },
                'ff-kebab-item': { props: ['label', 'disabled'], template: '<button :data-item="label" :disabled="disabled">{{ label }}</button>' },
                DiffTypeBadge: { props: ['type'], template: '<b>{{ type }}</b>' },
                FieldEditPanel: { props: ['pointer'], emits: ['apply', 'cancel'], template: '<div data-el="panel" :data-pointer="pointer" />' }
            }
        }
    })
    return builder
}

const paths = (builder) => builder.findAll('[data-el^="builder-row-"]').map(row => row.attributes('data-el').replace('builder-row-', ''))

describe('Schema builder', () => {
    beforeEach(() => vi.clearAllMocks())

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

    describe('on a draft', () => {
        const text = (builder) => JSON.parse(builder.emitted('update:schemaText').at(-1)[0])

        test('opens a field\'s edit panel under it from its menu', async () => {
            const builder = mountBuilder(undefined, false)
            await builder.find('[data-el="builder-row-/location"] [data-item="Edit"]').trigger('click')
            expect(builder.find('[data-el="panel"]').attributes('data-pointer')).toBe('/properties/location')
            expect(builder.find('[data-el="builder-row-/calibration"] [data-item="Edit"]').exists()).toBe(false)
        })

        test('writes the change back as JSON and closes the panel, keeping a renamed object open', async () => {
            const builder = mountBuilder(undefined, false)
            await builder.find('[data-el="builder-row-/location"] [data-action="builder-toggle"]').trigger('click')
            await builder.find('[data-el="builder-row-/location"] [data-item="Edit"]').trigger('click')
            const renamed = JSON.parse(JSON.stringify(SCHEMA))
            renamed.properties = { place: renamed.properties.location, calibration: renamed.properties.calibration }
            builder.findComponent('[data-el="panel"]').vm.$emit('apply', renamed)
            await builder.vm.$nextTick()
            expect(Object.keys(text(builder).properties)).toEqual(['place', 'calibration'])
            expect(builder.find('[data-el="panel"]').exists()).toBe(false)
            expect(builder.find('[data-el="builder-row-/place/site"]').exists()).toBe(true)
        })

        test('adds a field to an expanded object, or to the message, and opens it for editing', async () => {
            const builder = mountBuilder(undefined, false)
            await builder.find('[data-el="builder-row-/location"] [data-action="builder-toggle"]').trigger('click')
            await builder.find('[data-action="builder-add-field"]').trigger('click')
            expect(Object.keys(text(builder).properties.location.properties)).toEqual(['site', 'new_field'])
            expect(builder.find('[data-el="panel"]').attributes('data-pointer')).toBe('/properties/location/properties/new_field')
            await builder.find('[data-action="builder-add-root-field"]').trigger('click')
            expect(Object.keys(text(builder).properties)).toEqual(['location', 'calibration', 'new_field'])
        })

        test('allows fields the schema does not list, or not', async () => {
            const builder = mountBuilder(undefined, false)
            await builder.find('[data-action="builder-other-fields"]').setValue(true)
            expect(text(builder)).not.toHaveProperty('additionalProperties')
        })

        test('moves a field up and down, but not past either end', async () => {
            const builder = mountBuilder(undefined, false)
            expect(builder.find('[data-el="builder-row-/location"] [data-item="Move up"]').attributes('disabled')).toBeDefined()
            await builder.find('[data-el="builder-row-/location"] [data-item="Move down"]').trigger('click')
            expect(Object.keys(text(builder).properties)).toEqual(['calibration', 'location'])
            expect(builder.find('[data-el="builder-row-/location"] [data-item="Move down"]').attributes('disabled')).toBeDefined()
        })

        test('deletes a field with nothing inside it straight away', async () => {
            const builder = mountBuilder(undefined, false)
            await builder.find('[data-el="builder-row-/calibration"] [data-item="Delete field"]').trigger('click')
            await flushPromises()
            expect(Dialog.showAsync).not.toHaveBeenCalled()
            expect(Object.keys(text(builder).properties)).toEqual(['location'])
        })

        test('deletes an object only once that is confirmed, listing the fields that go with it', async () => {
            const builder = mountBuilder(undefined, false)
            Dialog.showAsync.mockResolvedValueOnce('cancel')
            await builder.find('[data-el="builder-row-/location"] [data-item="Delete field"]').trigger('click')
            await flushPromises()
            expect(builder.emitted('update:schemaText')).toBeUndefined()
            const [options] = Dialog.showAsync.mock.calls[0]
            expect(options.header).toBe('Delete location?')
            expect(options.text).toBe('This removes location and the 1 field inside it from the draft:\n\n/location/site\n\nlocation is also removed from the required list of the root object.')
            Dialog.showAsync.mockResolvedValueOnce('confirm')
            await builder.find('[data-el="builder-row-/location"] [data-item="Delete field"]').trigger('click')
            await flushPromises()
            expect(text(builder)).toMatchObject({ properties: { calibration: {} } })
            expect(text(builder)).not.toHaveProperty('required')
        })

        test('shows a field the draft deleted and puts it back', async () => {
            const published = { ...SCHEMA, properties: { serial: { type: 'string' }, ...SCHEMA.properties } }
            const builder = mountBuilder(undefined, false, published)
            const row = builder.find('[data-el="builder-row-/serial"]')
            expect(row.attributes('data-deleted')).toBe('true')
            expect(row.text()).toContain('In 1.2.0, deleted in this draft')
            await row.find('[data-action="builder-restore"]').trigger('click')
            expect(Object.keys(text(builder).properties)).toEqual(['serial', 'location', 'calibration'])
            expect(builder.find('[data-el="builder-row-/serial"]').attributes('data-deleted')).toBeUndefined()
        })

        test('offers no editing when read-only', () => {
            const builder = mountBuilder()
            expect(builder.find('[data-item="Edit"]').exists()).toBe(false)
            expect(builder.find('[data-action="builder-add-root-field"]').exists()).toBe(false)
        })
    })

    test('says so when the schema has no fields', () => {
        expect(mountBuilder('{"type": "object"}').find('[data-el="builder-no-fields"]').exists()).toBe(true)
    })
})
