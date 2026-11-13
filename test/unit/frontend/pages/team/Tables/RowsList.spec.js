import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import RowsList from '../../../../../../frontend/src/pages/team/Tables/Table/TableExplorer/components/RowsList.vue'
import ForgeUIComponents from '../../../../../../frontend/src/ui-components/index.js'

const mocks = vi.hoisted(() => ({
    tablesStore: { tables: {}, tableSelection: null, isLoading: false, selectedTable: null },
    contextStore: { team: { id: 't1' }, teamMembership: { role: 50 } },
    drawersStore: { openRightDrawer: vi.fn() }
}))

vi.mock('@/stores/product-tables.js', () => ({ useProductTablesStore: () => mocks.tablesStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore: () => mocks.contextStore }))
vi.mock('@/stores/ux-drawers.js', () => ({ useUxDrawersStore: () => mocks.drawersStore }))

function mountRowsList () {
    return mount(RowsList, {
        global: {
            plugins: [ForgeUIComponents],
            mocks: { $route: { params: { id: 'db1' } } }
        }
    })
}

describe('RowsList', () => {
    test('renders column names and types as text, not markup', () => {
        mocks.tablesStore.selectedTable = {
            schema: [{ name: '<img src=x onerror=alert(1)>', safeName: 'col', type: '<b>text</b>' }],
            payload: { safe: [] }
        }

        const wrapper = mount(RowsList, {
            global: {
                plugins: [ForgeUIComponents],
                mocks: { $route: { params: { id: 'db1' } } }
            }
        })

        expect(wrapper.find('img').exists()).toBe(false)
        expect(wrapper.find('thead b').exists()).toBe(false)
        expect(wrapper.find('thead').text()).toContain('<img src=x onerror=alert(1)>')
        expect(wrapper.find('thead').text()).toContain('<b>text</b>')
    })

    describe('when the database has no tables', () => {
        beforeEach(() => {
            mocks.contextStore.teamMembership = { role: 50 }
        })

        test('does not offer a member a way to create the first table', () => {
            mocks.contextStore.teamMembership = { role: 30 }
            mocks.tablesStore.selectedTable = null
            mocks.tablesStore.tables = { db1: [] }

            const emptyState = mountRowsList().find('[data-el="no-tables"]')

            expect(emptyState.text()).toContain('No tables yet')
            expect(emptyState.text()).toContain('Once a team owner creates a table')
            expect(emptyState.find('[data-action="create-table"]').exists()).toBe(false)
        })

        test('shows the empty state with a way to create the first table', async () => {
            mocks.tablesStore.selectedTable = null
            mocks.tablesStore.tables = { db1: [] }

            const wrapper = mountRowsList()

            const emptyState = wrapper.find('[data-el="no-tables"]')
            expect(emptyState.exists()).toBe(true)
            expect(emptyState.text()).toContain('No tables yet')

            await emptyState.find('[data-action="create-table"]').trigger('click')
            expect(mocks.drawersStore.openRightDrawer).toHaveBeenCalledTimes(1)
        })

        test('does not show the empty state while the tables are still loading', () => {
            mocks.tablesStore.selectedTable = null
            mocks.tablesStore.tables = {}

            expect(mountRowsList().find('[data-el="no-tables"]').exists()).toBe(false)
        })

        test('does not show the empty state when the database has tables', () => {
            mocks.tablesStore.selectedTable = null
            mocks.tablesStore.tables = { db1: [{ name: 'readings', dbSchema: 'public' }] }

            expect(mountRowsList().find('[data-el="no-tables"]').exists()).toBe(false)
        })
    })
})
