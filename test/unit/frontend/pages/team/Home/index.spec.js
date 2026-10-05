import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { reactive } from 'vue'

enableAutoUnmount(afterEach)

const mocks = vi.hoisted(() => ({
    contextStore: { team: { id: 't1', slug: 'ateam' } },
    settingsStore: { featuresCheck: {} },
    accountStore: { pendingTeamChange: false },
    toursStore: { tours: {} },
    teamAPI: {
        getTeamInstanceCounts: vi.fn().mockResolvedValue({}),
        getTeamAuditLog: vi.fn().mockResolvedValue({ log: [] })
    }
}))

vi.mock('@/stores/context.js', () => ({ useContextStore: () => mocks.contextStore }))
vi.mock('@/stores/account-settings.js', () => ({ useAccountSettingsStore: () => mocks.settingsStore }))
vi.mock('@/stores/account.js', () => ({ useAccountStore: () => mocks.accountStore }))
vi.mock('@/stores/ux-tours.js', () => ({ useUxToursStore: () => mocks.toursStore }))
vi.mock('@/api/team.js', () => ({ default: mocks.teamAPI }))

vi.mock('@/pages/team/Home/Expert/index.vue', () => ({
    default: { name: 'TeamHomeExpert', template: '<div data-stub="expert-home" />' }
}))

import Home from '../../../../../../frontend/src/pages/team/Home/index.vue'

mocks.contextStore = reactive(mocks.contextStore)
mocks.settingsStore = reactive(mocks.settingsStore)

async function mountHome ({ expert = false } = {}) {
    mocks.settingsStore.featuresCheck = { isExpertAssistantFeatureEnabled: expert }
    const wrapper = mount(Home, {
        global: {
            stubs: {
                'ff-page': { template: '<div><slot name="header" /><slot /></div>' },
                'ff-page-header': { template: '<div><slot name="breadcrumbs" /></div>' },
                'ff-nav-breadcrumb': true,
                'ff-loading': true,
                'ff-button': true,
                DashboardSection: { template: '<div data-stub="dashboard-section"><slot /></div>' },
                RecentlyModifiedInstances: true,
                RecentlyModifiedDevices: true,
                InstanceStat: true,
                AuditLog: true,
                EmptyState: true,
                TeamDeviceCreateDialog: true,
                DeviceCredentialsDialog: true,
                ConfirmInstanceDeleteDialog: true
            },
            directives: { 'ff-tooltip': {} },
            mocks: {
                $route: { query: {}, params: { team_slug: 'ateam' } },
                $router: { push: vi.fn(), replace: vi.fn() }
            }
        }
    })
    await flushPromises()
    return wrapper
}

describe('team Home variant switch', () => {
    test('renders the dashboard when the Expert is not enabled', async () => {
        const wrapper = await mountHome({ expert: false })
        expect(wrapper.find('[data-stub="dashboard-section"]').exists()).toBe(true)
        expect(wrapper.find('[data-stub="expert-home"]').exists()).toBe(false)
    })

    test('renders the Expert page when the Expert is enabled', async () => {
        const wrapper = await mountHome({ expert: true })
        expect(wrapper.find('[data-stub="expert-home"]').exists()).toBe(true)
        expect(wrapper.find('[data-stub="dashboard-section"]').exists()).toBe(false)
    })

    test('skips the dashboard data fetches entirely on the Expert variant', async () => {
        mocks.teamAPI.getTeamInstanceCounts.mockClear()
        mocks.teamAPI.getTeamAuditLog.mockClear()

        await mountHome({ expert: true })

        expect(mocks.teamAPI.getTeamInstanceCounts).not.toHaveBeenCalled()
        expect(mocks.teamAPI.getTeamAuditLog).not.toHaveBeenCalled()
    })

    test('still fetches dashboard data on the dashboard variant', async () => {
        mocks.teamAPI.getTeamInstanceCounts.mockClear()
        mocks.teamAPI.getTeamAuditLog.mockClear()

        await mountHome({ expert: false })

        expect(mocks.teamAPI.getTeamInstanceCounts).toHaveBeenCalled()
        expect(mocks.teamAPI.getTeamAuditLog).toHaveBeenCalled()
    })

    test('swaps to the dashboard when the Expert feature is turned off mid-visit', async () => {
        const wrapper = await mountHome({ expert: true })
        expect(wrapper.find('[data-stub="expert-home"]').exists()).toBe(true)

        mocks.settingsStore.featuresCheck = { isExpertAssistantFeatureEnabled: false }
        await flushPromises()

        // the watcher must kick off the fetches the mount hook skipped, or the
        // dashboard renders its loading state forever
        expect(mocks.teamAPI.getTeamAuditLog).toHaveBeenCalled()
        expect(wrapper.find('[data-stub="dashboard-section"]').exists()).toBe(true)
        expect(wrapper.find('[data-stub="expert-home"]').exists()).toBe(false)
    })
})
