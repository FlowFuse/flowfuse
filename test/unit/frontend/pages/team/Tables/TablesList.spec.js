import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import TablesList from '../../../../../../frontend/src/pages/team/Tables/Table/TableExplorer/components/TablesList.vue'
import ForgeUIComponents from '../../../../../../frontend/src/ui-components/index.js'

const mocks = vi.hoisted(() => ({
    tablesStore: { tables: {}, tableSelection: null, updateTableSelection: vi.fn() },
    contextStore: { teamMembership: { role: 50 } },
    drawersStore: { rightDrawer: {}, openRightDrawer: vi.fn(), closeRightDrawer: vi.fn() }
}))

vi.mock('@/stores/product-tables.js', () => ({ useProductTablesStore: () => mocks.tablesStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore: () => mocks.contextStore }))
vi.mock('@/stores/ux-drawers.js', () => ({ useUxDrawersStore: () => mocks.drawersStore }))

function mountTablesList () {
    return mount(TablesList, {
        global: {
            plugins: [ForgeUIComponents],
            mocks: { $route: { params: { id: 'db1' } } }
        }
    })
}

describe('TablesList', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('for a team owner', () => {
        beforeEach(() => {
            mocks.contextStore.teamMembership = { role: 50 }
        })

        test('offers to create a table, from the button and from the empty list', async () => {
            const wrapper = mountTablesList()

            expect(wrapper.find('.empty-state .cta').exists()).toBe(true)
            await wrapper.find('[data-action="create-table"]').trigger('click')
            expect(mocks.drawersStore.openRightDrawer).toHaveBeenCalledTimes(1)
        })
    })

    describe('for a team member', () => {
        beforeEach(() => {
            mocks.contextStore.teamMembership = { role: 30 }
        })

        test('does not offer to create a table', () => {
            const wrapper = mountTablesList()

            expect(wrapper.find('[data-action="create-table"]').exists()).toBe(false)
            expect(wrapper.find('.empty-state .cta').exists()).toBe(false)
        })

        test('still explains how tables get created from Node-RED', () => {
            expect(mountTablesList().find('.empty-state').text()).toContain('@flowfuse/nr-tables-nodes')
        })
    })
})
