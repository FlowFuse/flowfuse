import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import TableSchema from '../../../../../../frontend/src/pages/team/Tables/Table/TableExplorer/drawers/TableSchema.vue'

const mocks = vi.hoisted(() => ({
    tablesStore: { deleteTable: vi.fn(), getTables: vi.fn() },
    contextStore: { team: { id: 't1' }, teamMembership: { role: 50 } },
    drawersStore: { closeRightDrawer: vi.fn(), setRightDrawerHeader: vi.fn() }
}))

vi.mock('@/stores/product-tables.js', () => ({ useProductTablesStore: () => mocks.tablesStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore: () => mocks.contextStore }))
vi.mock('@/stores/ux-drawers.js', () => ({ useUxDrawersStore: () => mocks.drawersStore }))

function visibleActions () {
    mount(TableSchema, {
        props: { table: { name: 'readings', dbSchema: 'public', schema: [] } },
        global: { mocks: { $route: { params: { id: 'db1' } } } }
    })
    const { actions } = mocks.drawersStore.setRightDrawerHeader.mock.calls[0][0]
    return actions.filter(action => !action.hidden).map(action => action.label)
}

describe('TableSchema', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('lets a team owner delete the table', () => {
        mocks.contextStore.teamMembership = { role: 50 }
        expect(visibleActions()).toEqual(['Close', 'Delete'])
    })

    test('does not offer a team member the delete action', () => {
        mocks.contextStore.teamMembership = { role: 30 }
        expect(visibleActions()).toEqual(['Close'])
    })
})
