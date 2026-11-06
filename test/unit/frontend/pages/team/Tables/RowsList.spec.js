import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

import RowsList from '../../../../../../frontend/src/pages/team/Tables/Table/TableExplorer/components/RowsList.vue'
import ForgeUIComponents from '../../../../../../frontend/src/ui-components/index.js'

const mocks = vi.hoisted(() => ({
    tablesStore: { tableSelection: null, isLoading: false, selectedTable: null },
    contextStore: { team: { id: 't1' } }
}))

vi.mock('@/stores/product-tables.js', () => ({ useProductTablesStore: () => mocks.tablesStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore: () => mocks.contextStore }))

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
})
