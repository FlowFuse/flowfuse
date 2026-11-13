import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import TablesList from '../../../../../../frontend/src/pages/team/Tables/Table/TableExplorer/components/TablesList.vue'
import ForgeUIComponents from '../../../../../../frontend/src/ui-components/index.js'

const mocks = vi.hoisted(() => ({
    tablesStore: { tables: {}, tableSelection: null, updateTableSelection: vi.fn() },
    drawersStore: { rightDrawer: {}, openRightDrawer: vi.fn(), closeRightDrawer: vi.fn() }
}))

vi.mock('@/stores/product-tables.js', () => ({ useProductTablesStore: () => mocks.tablesStore }))
vi.mock('@/stores/ux-drawers.js', () => ({ useUxDrawersStore: () => mocks.drawersStore }))

// in the order the store hands them over: by schema, then by name
const tables = [
    { name: 'batches', dbSchema: 'public' },
    { name: 'shifts', dbSchema: 'public' },
    { name: 'batches', dbSchema: 'reporting' },
    { name: 'daily_totals', dbSchema: 'reporting' }
]

async function mountTablesList () {
    const wrapper = mount(TablesList, {
        global: {
            plugins: [ForgeUIComponents],
            mocks: { $route: { params: { id: 'db1' } } }
        }
    })
    await wrapper.setData({ tables })
    return wrapper
}

function groupsOf (wrapper) {
    return wrapper.findAll('.schema-group').map(group => ({
        schema: group.find('.schema-name').text(),
        tables: group.findAll('.item').map(item => item.text())
    }))
}

describe('TablesList', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.tablesStore.tableSelection = null
    })

    test('lists the tables under the schema they belong to', async () => {
        const wrapper = await mountTablesList()

        expect(groupsOf(wrapper)).toEqual([
            { schema: 'public', tables: ['batches', 'shifts'] },
            { schema: 'reporting', tables: ['batches', 'daily_totals'] }
        ])
    })

    test('selects a table together with its schema', async () => {
        const wrapper = await mountTablesList()

        await wrapper.find('[data-schema="reporting"] .item').trigger('click')

        expect(mocks.tablesStore.updateTableSelection).toHaveBeenCalledWith({ name: 'batches', dbSchema: 'reporting' })
    })

    test('marks only the selected table as active when two schemas share a table name', async () => {
        mocks.tablesStore.tableSelection = { name: 'batches', dbSchema: 'reporting' }
        const wrapper = await mountTablesList()

        expect(wrapper.findAll('.item.active')).toHaveLength(1)
        expect(wrapper.find('[data-schema="reporting"] .item.active').text()).toBe('batches')
    })

    test('hides and shows the tables of a schema when its name is clicked', async () => {
        const wrapper = await mountTablesList()
        const group = wrapper.find('[data-schema="public"]')

        await group.find('button').trigger('click')
        expect(group.findAll('.item')).toHaveLength(0)
        expect(wrapper.findAll('[data-schema="reporting"] .item')).toHaveLength(2)

        await group.find('button').trigger('click')
        expect(group.findAll('.item')).toHaveLength(2)
    })

    test('searching leaves out the schemas with no matching table', async () => {
        const wrapper = await mountTablesList()

        await wrapper.find('[data-form="search"] input').setValue('daily')

        expect(groupsOf(wrapper)).toEqual([{ schema: 'reporting', tables: ['daily_totals'] }])
    })
})
