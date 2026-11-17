import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import TeamTables from '../../../../../../frontend/src/pages/team/Tables/index.vue'
import ForgeUIComponents from '../../../../../../frontend/src/ui-components/index.js'

const mocks = vi.hoisted(() => ({
    tablesStore: { databases: {}, getDatabases: vi.fn(() => Promise.resolve()), updateDatabaseSelection: vi.fn() },
    contextStore: { teamMembership: { role: 50 } },
    accountStore: { pendingTeamChange: false },
    settingsStore: {
        featuresCheck: { isTablesFeatureEnabled: true, isTablesFeatureEnabledForPlatform: true, isTablesFeatureEnabledForTeam: true }
    },
    router: { push: vi.fn(), replace: vi.fn() }
}))

vi.mock('@/stores/product-tables.js', () => ({ useProductTablesStore: () => mocks.tablesStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore: () => mocks.contextStore }))
vi.mock('@/stores/account.js', () => ({ useAccountStore: () => mocks.accountStore }))
vi.mock('@/stores/account-settings.js', () => ({ useAccountSettingsStore: () => mocks.settingsStore }))

async function mountTeamTables () {
    const wrapper = mount(TeamTables, {
        global: {
            plugins: [ForgeUIComponents],
            mocks: { $route: { params: {}, fullPath: '/team/t1/tables' }, $router: mocks.router },
            stubs: { 'ff-page': { template: '<div><slot /></div>' }, 'router-view': { template: '<div data-el="router-view" />' } }
        }
    })
    await flushPromises()
    return wrapper
}

describe('TeamTables', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.tablesStore.databases = {}
    })

    describe('when the team has no database yet', () => {
        test('sends a team owner to the page for creating one', async () => {
            mocks.contextStore.teamMembership = { role: 50 }
            const wrapper = await mountTeamTables()

            expect(mocks.router.replace).toHaveBeenCalledWith({ name: 'team-tables-add' })
            expect(wrapper.find('[data-el="no-database"]').exists()).toBe(false)
        })

        test('tells a team member an owner has to set one up, without sending them anywhere', async () => {
            mocks.contextStore.teamMembership = { role: 30 }
            const wrapper = await mountTeamTables()

            expect(wrapper.find('[data-el="no-database"]').text()).toContain('Once a team owner sets one up')
            expect(wrapper.find('[data-el="router-view"]').exists()).toBe(false)
            expect(mocks.router.replace).not.toHaveBeenCalled()
            expect(mocks.router.push).not.toHaveBeenCalled()
        })
    })

    test('takes a team member to the database when the team has one', async () => {
        mocks.contextStore.teamMembership = { role: 30 }
        mocks.tablesStore.databases = { db1: { id: 'db1' } }
        const wrapper = await mountTeamTables()

        expect(wrapper.find('[data-el="no-database"]').exists()).toBe(false)
        expect(mocks.router.push).toHaveBeenCalledWith({ name: 'team-tables-table', params: { id: 'db1' } })
    })
})
