import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import RowsHeader from '../../../../../../frontend/src/pages/team/Tables/Table/TableExplorer/components/RowsHeader.vue'
import ForgeUIComponents from '../../../../../../frontend/src/ui-components/index.js'

const mocks = vi.hoisted(() => ({
    tablesStore: {
        tableSelection: { name: 'readings', dbSchema: 'public' },
        selectedTable: { name: 'readings', dbSchema: 'public' },
        showOriginalValues: false,
        getTableData: vi.fn(() => Promise.resolve()),
        setShowOriginalValues: vi.fn(),
        setTableLoadingState: vi.fn()
    },
    contextStore: { team: { id: 't1' } }
}))

vi.mock('@/stores/product-tables.js', () => ({ useProductTablesStore: () => mocks.tablesStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore: () => mocks.contextStore }))

function mountRowsHeader () {
    return mount(RowsHeader, {
        props: { menuCollapsed: false },
        global: {
            plugins: [ForgeUIComponents],
            stubs: { TextCopier: true },
            mocks: { $route: { params: { id: 'db1' } } }
        }
    })
}

describe('RowsHeader', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.tablesStore.showOriginalValues = false
    })

    describe('show original values', () => {
        test('turns on when the switch is clicked', async () => {
            const wrapper = mountRowsHeader()

            await wrapper.find('[data-el="show-original-values"] .ff-toggle-switch-slider').trigger('click')

            expect(mocks.tablesStore.setShowOriginalValues).toHaveBeenCalledWith(true)
        })

        test('turns on when the words next to the switch are clicked', async () => {
            const wrapper = mountRowsHeader()

            await wrapper.find('[data-el="show-original-values"] span').trigger('click')

            expect(mocks.tablesStore.setShowOriginalValues).toHaveBeenCalledWith(true)
        })

        test('turns off again from the words when it is on', async () => {
            mocks.tablesStore.showOriginalValues = true
            const wrapper = mountRowsHeader()

            await wrapper.find('[data-el="show-original-values"] span').trigger('click')

            expect(mocks.tablesStore.setShowOriginalValues).toHaveBeenCalledWith(false)
        })
    })
})
