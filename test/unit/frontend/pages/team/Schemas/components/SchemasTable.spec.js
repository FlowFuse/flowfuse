import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

import SchemasTable from '../../../../../../../frontend/src/pages/team/Schemas/components/SchemasTable.vue'

const summary = (id, extra = {}) => ({ id, name: `Schema ${id}`, description: '', group: null, latestVersion: null, hasDraft: false, updatedAt: '2026-11-01T00:00:00Z', ...extra })
const GROUPS = [{ id: 'g1', name: 'Energy', schemaCount: 2 }, { id: 'g2', name: 'Line', schemaCount: 0 }]
const PAGES = {
    g1: { schemas: [summary('a', { latestVersion: '1.2.0', hasDraft: true, description: 'kWh from sub-meters' }), summary('b')], count: 5, nextCursor: 'b' },
    g2: { schemas: [], count: 0 },
    none: { schemas: [summary('c')], count: 1 }
}

function mountTable (props = {}) {
    return mount(SchemasTable, {
        props: { groups: GROUPS, groupSchemas: PAGES, query: '', ...props },
        global: {
            stubs: {
                'ff-data-table': { template: '<table><tbody><slot name="rows" /></tbody></table>' },
                'ff-data-table-row': { template: '<tr><slot /></tr>' },
                'ff-data-table-cell': { template: '<td><slot /></td>' },
                'ff-kebab-menu': { template: '<div data-el="kebab-menu"><slot /></div>' },
                'ff-kebab-item': { props: ['label'], template: '<button :data-item="label">{{ label }}</button>' },
                'ff-button': { template: '<button><slot /></button>' },
                'router-link': { props: ['to'], template: '<a :data-schema="to.params.schemaId"><slot /></a>' },
                StatusBadge: { props: ['text'], template: '<span data-el="draft-badge">{{ text }}</span>' }
            }
        }
    })
}

const sectionNames = (table) => table.findAll('.schema-group__name').map(name => name.text())
const rowIds = (table) => table.findAll('[data-el^="schema-row-"]').map(row => row.attributes('data-el').replace('schema-row-', ''))

describe('Schemas table', () => {
    test('shows a section per group, empty ones included, then the schemas in no group', () => {
        const table = mountTable()
        expect(sectionNames(table)).toEqual(['Energy', 'Line', 'Ungrouped'])
        expect(table.findAll('.schema-group__count').map(count => count.text())).toEqual(['5 schemas', '0 schemas', '1 schema'])
        expect(rowIds(table)).toEqual(['a', 'b', 'c'])
    })

    test('leaves out the Ungrouped section when every schema is in a group', () => {
        expect(sectionNames(mountTable({ groupSchemas: { ...PAGES, none: { schemas: [], count: 0 } } }))).toEqual(['Energy', 'Line'])
    })

    test('shows what the list knows about a schema, and links to it', () => {
        const row = mountTable().find('[data-el="schema-row-a"]')
        expect(row.find('a').attributes('data-schema')).toBe('a')
        expect(row.text()).toContain('kWh from sub-meters')
        expect(row.find('[data-el="schema-latest-version"]').text()).toBe('1.2.0')
        expect(row.find('[data-el="schema-draft"]').text()).toBe('Draft')
        const unpublished = mountTable().find('[data-el="schema-row-b"]')
        expect(unpublished.find('[data-el="schema-latest-version"]').text()).toBe('Not published')
        expect(unpublished.find('[data-el="schema-draft"]').text()).toBe('None')
    })

    test('hides a group\'s schemas when it is collapsed and shows them again when it is opened', async () => {
        const table = mountTable()
        await table.find('[data-el="schema-group-g1"] [data-action="toggle-group"]').trigger('click')
        expect(rowIds(table)).toEqual(['c'])
        await table.find('[data-el="schema-group-g1"] [data-action="toggle-group"]').trigger('click')
        expect(rowIds(table)).toEqual(['a', 'b', 'c'])
    })

    test('offers more only for a group the server has more of, and says which group', async () => {
        const table = mountTable()
        expect(table.findAll('[data-action="load-more"]')).toHaveLength(1)
        await table.find('[data-action="load-more"]').trigger('click')
        expect(table.emitted('load-more')[0]).toEqual(['g1'])
    })

    test('keeps the groups in a search, leaving out the ones with no match', () => {
        const found = { g1: { schemas: [summary('a')], count: 1 }, g2: { schemas: [], count: 0 }, none: { schemas: [], count: 0 } }
        const table = mountTable({ query: 'schema a', groupSchemas: found })
        expect(sectionNames(table)).toEqual(['Energy'])
        expect(rowIds(table)).toEqual(['a'])
    })

    test('keeps a group that matches a search by its name, even with no schemas', () => {
        const found = { g1: { schemas: [], count: 0 }, g2: { schemas: [], count: 0 }, none: { schemas: [], count: 0 } }
        expect(sectionNames(mountTable({ query: 'LIN', groupSchemas: found }))).toEqual(['Line'])
    })

    test('opens every group again when the search changes', async () => {
        const table = mountTable()
        await table.find('[data-el="schema-group-g1"] [data-action="toggle-group"]').trigger('click')
        await table.setProps({ query: 'schema' })
        expect(rowIds(table)).toEqual(['a', 'b', 'c'])
    })

    test('offers Rename and Delete on every group but not on Ungrouped, and says which group', async () => {
        const table = mountTable({ canRename: true, canDelete: true })
        expect(table.findAll('[data-el="kebab-menu"]')).toHaveLength(2)
        expect(table.find('[data-el="schema-group-none"] [data-el="kebab-menu"]').exists()).toBe(false)
        await table.find('[data-el="schema-group-g1"] [data-item="Rename"]').trigger('click')
        expect(table.emitted('rename-group')[0]).toEqual([GROUPS[0]])
        await table.find('[data-el="schema-group-g2"] [data-item="Delete"]').trigger('click')
        expect(table.emitted('delete-group')[0]).toEqual([GROUPS[1]])
    })

    test('offers only what is allowed, and no menu at all when nothing is', () => {
        const renameOnly = mountTable({ canRename: true })
        expect(renameOnly.find('[data-item="Rename"]').exists()).toBe(true)
        expect(renameOnly.find('[data-item="Delete"]').exists()).toBe(false)
        expect(mountTable().find('[data-el="kebab-menu"]').exists()).toBe(false)
    })

    test('says so when a search finds nothing', () => {
        const found = { g1: { schemas: [], count: 0 }, g2: { schemas: [], count: 0 }, none: { schemas: [], count: 0 } }
        const table = mountTable({ query: 'nope', groupSchemas: found })
        expect(sectionNames(table)).toEqual([])
        expect(table.find('[data-el="schemas-no-results"]').text()).toBe('No schemas or groups match "nope"')
    })
})
