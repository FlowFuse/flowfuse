import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { reactive } from 'vue'

enableAutoUnmount(afterEach)

const mocks = vi.hoisted(() => ({
    contextStore: { team: null },
    settingsStore: { featuresCheck: {} }
}))

vi.mock('@/stores/context.js', () => ({ useContextStore: () => mocks.contextStore }))
vi.mock('@/stores/account-settings.js', () => ({ useAccountSettingsStore: () => mocks.settingsStore }))

vi.mock('@/pages/team/Home/Dashboard/index.vue', () => ({
    default: { name: 'TeamHome', template: '<div data-stub="dashboard" />' }
}))
vi.mock('@/pages/team/Home/Expert/index.vue', () => ({
    default: { name: 'TeamHomeExpert', template: '<div data-stub="expert-home" />' }
}))

import Home from '../../../../../../frontend/src/pages/team/Home/index.vue'

mocks.contextStore = reactive(mocks.contextStore)
mocks.settingsStore = reactive(mocks.settingsStore)

function setState ({ team = { id: 't1', slug: 'ateam' }, expert = false } = {}) {
    mocks.contextStore.team = team
    mocks.settingsStore.featuresCheck = { isExpertAssistantFeatureEnabled: expert }
}

describe('team Home variant switch', () => {
    test('renders the dashboard page when the Expert is not enabled', () => {
        setState({ expert: false })
        const wrapper = mount(Home)
        expect(wrapper.find('[data-stub="dashboard"]').exists()).toBe(true)
        expect(wrapper.find('[data-stub="expert-home"]').exists()).toBe(false)
    })

    test('renders the Expert page when the Expert is enabled', () => {
        setState({ expert: true })
        const wrapper = mount(Home)
        expect(wrapper.find('[data-stub="expert-home"]').exists()).toBe(true)
        expect(wrapper.find('[data-stub="dashboard"]').exists()).toBe(false)
    })

    test('mounts neither variant before the team resolves', () => {
        setState({ team: null, expert: true })
        const wrapper = mount(Home)
        expect(wrapper.find('[data-stub="expert-home"]').exists()).toBe(false)
        expect(wrapper.find('[data-stub="dashboard"]').exists()).toBe(false)
    })

    test('swaps to the dashboard page when the Expert feature is turned off mid-visit', async () => {
        setState({ expert: true })
        const wrapper = mount(Home)
        expect(wrapper.find('[data-stub="expert-home"]').exists()).toBe(true)

        mocks.settingsStore.featuresCheck = { isExpertAssistantFeatureEnabled: false }
        await wrapper.vm.$nextTick()

        expect(wrapper.find('[data-stub="dashboard"]').exists()).toBe(true)
        expect(wrapper.find('[data-stub="expert-home"]').exists()).toBe(false)
    })
})
