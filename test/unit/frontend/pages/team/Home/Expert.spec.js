import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { reactive } from 'vue'

enableAutoUnmount(afterEach)

const mocks = vi.hoisted(() => ({
    accountAuthStore: { user: { name: 'Noley Holland' } },
    contextStore: { isImmersiveEditor: false },
    settingsStore: { featuresCheck: { isExpertAssistantFeatureEnabled: true, isExpertInsightsFeatureEnabled: false } },
    expertStore: { messages: [], openAssistantDrawer: vi.fn(), setPendingInput: vi.fn(), setAgentMode: vi.fn(), resumeSessionTimer: vi.fn() },
    drawersStore: {
        rightDrawer: { state: false, expertState: { pinned: true, open: true }, expertSuppressed: false },
        suppressExpertDrawer: vi.fn(),
        releaseExpertDrawer: vi.fn(),
        closeRightDrawer: vi.fn()
    }
}))

vi.mock('@/stores/account-auth.js', () => ({ useAccountAuthStore: () => mocks.accountAuthStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore: () => mocks.contextStore }))
vi.mock('@/stores/account-settings.js', () => ({ useAccountSettingsStore: () => mocks.settingsStore }))
vi.mock('@/stores/product-expert.js', () => ({ useProductExpertStore: () => mocks.expertStore }))
vi.mock('@/stores/ux-drawers.js', () => ({ useUxDrawersStore: () => mocks.drawersStore }))

vi.mock('@/components/expert/Expert.vue', () => ({
    default: { name: 'ExpertPanel', template: '<div data-stub="expert-panel" />' }
}))
vi.mock('@/components/expert/components/ExpertModeSwitcher.vue', () => ({
    default: { name: 'ExpertModeSwitcher', template: '<div data-stub="mode-switcher" />' }
}))

import ExpertPage from '../../../../../../frontend/src/pages/team/Home/Expert/index.vue'

mocks.expertStore = reactive(mocks.expertStore)

async function mountPage () {
    const wrapper = mount(ExpertPage, {
        global: {
            stubs: {
                // a `true` stub drops the default slot, so nothing below would render
                'ff-page': { template: '<div><slot name="header" /><slot /></div>' },
                'ff-page-header': { template: '<div><slot name="breadcrumbs" /></div>' },
                'ff-nav-breadcrumb': { template: '<span><slot /></span>' }
            }
        }
    })
    await flushPromises()
    return wrapper
}

describe('TeamHomeExpert', () => {
    test('renders the greeting', async () => {
        const wrapper = await mountPage()
        expect(wrapper.find('[data-el="greeting"]').exists()).toBe(true)
        expect(wrapper.find('[data-el="greeting-text"]').text()).toContain('Noley')
    })

    test('suppresses the side panel on mount and releases it on unmount', async () => {
        mocks.drawersStore.suppressExpertDrawer.mockClear()
        mocks.drawersStore.releaseExpertDrawer.mockClear()
        mocks.drawersStore.rightDrawer.state = true

        const wrapper = await mountPage()
        expect(mocks.drawersStore.suppressExpertDrawer).toHaveBeenCalledTimes(1)
        expect(mocks.drawersStore.closeRightDrawer).toHaveBeenCalledWith({ preserveExpertState: true })
        expect(mocks.drawersStore.releaseExpertDrawer).not.toHaveBeenCalled()

        wrapper.unmount()
        expect(mocks.drawersStore.releaseExpertDrawer).toHaveBeenCalledTimes(1)
    })

    test('suppression is in place before anything else could reopen the panel', async () => {
        const order = []
        mocks.drawersStore.suppressExpertDrawer.mockImplementation(() => order.push('suppress'))
        mocks.drawersStore.closeRightDrawer.mockImplementation(() => order.push('close'))
        mocks.drawersStore.rightDrawer.state = true

        await mountPage()

        // RightDrawer's restore is behind a 25ms timeout, so a sync suppress always wins
        expect(order[0]).toBe('suppress')
        mocks.drawersStore.suppressExpertDrawer.mockImplementation(() => {})
        mocks.drawersStore.closeRightDrawer.mockImplementation(() => {})
    })

    test('does not close a drawer that is not open, which would deafen the app for 300ms', async () => {
        mocks.drawersStore.closeRightDrawer.mockClear()
        mocks.drawersStore.rightDrawer.state = false

        await mountPage()

        expect(mocks.drawersStore.closeRightDrawer).not.toHaveBeenCalled()
    })

    test('does not hand the panel back into an immersive editor, which has none', async () => {
        mocks.contextStore.isImmersiveEditor = true
        mocks.drawersStore.rightDrawer.expertState = { pinned: true, open: true }
        mocks.expertStore.openAssistantDrawer.mockClear()

        const wrapper = await mountPage()
        wrapper.unmount()

        expect(mocks.expertStore.openAssistantDrawer).not.toHaveBeenCalled()
        mocks.contextStore.isImmersiveEditor = false
    })

    test('never writes the saved pinned preference', async () => {
        mocks.drawersStore.rightDrawer.expertState = { pinned: true, open: true }

        const wrapper = await mountPage()
        wrapper.unmount()

        expect(mocks.drawersStore.rightDrawer.expertState).toEqual({ pinned: true, open: true })
    })

    test('hands the panel back on the way out, pinned as the user left it', async () => {
        mocks.drawersStore.rightDrawer.expertState = { pinned: true, open: true }
        mocks.expertStore.openAssistantDrawer.mockClear()

        const wrapper = await mountPage()
        expect(mocks.expertStore.openAssistantDrawer).not.toHaveBeenCalled()

        wrapper.unmount()
        expect(mocks.expertStore.openAssistantDrawer).toHaveBeenCalledWith({ openPinned: true })
    })

    test('reopens unpinned when that is how the user had it', async () => {
        mocks.drawersStore.rightDrawer.expertState = { pinned: false, open: true }
        mocks.expertStore.openAssistantDrawer.mockClear()

        const wrapper = await mountPage()
        wrapper.unmount()

        expect(mocks.expertStore.openAssistantDrawer).toHaveBeenCalledWith({ openPinned: false })
    })

    test('leaves the panel shut if the user had it shut', async () => {
        mocks.drawersStore.rightDrawer.expertState = { pinned: false, open: false }
        mocks.expertStore.openAssistantDrawer.mockClear()

        const wrapper = await mountPage()
        wrapper.unmount()

        expect(mocks.expertStore.openAssistantDrawer).not.toHaveBeenCalled()
    })

    test('lands idle: greeting, composer, no back control', async () => {
        mocks.expertStore.messages = []
        const wrapper = await mountPage()

        expect(wrapper.find('[data-el="expert-home"]').attributes('data-stage')).toBe('idle')
        expect(wrapper.find('[data-el="greeting"]').exists()).toBe(true)
        expect(wrapper.find('[data-stub="expert-panel"]').exists()).toBe(true)
    })

    test('typing moves to composing, which fades the surroundings but sends nothing', async () => {
        mocks.expertStore.messages = []
        const wrapper = await mountPage()

        await wrapper.find('[data-el="expert-home-surface"]').trigger('input')

        const root = wrapper.find('[data-el="expert-home"]')
        expect(root.attributes('data-stage')).toBe('composing')
        expect(root.classes()).toContain('is-composing')
        expect(root.classes()).not.toContain('is-conversing')
    })

    test('sending is what opens the transcript, not typing', async () => {
        mocks.expertStore.messages = []
        const wrapper = await mountPage()
        await wrapper.find('[data-el="expert-home-surface"]').trigger('input')
        expect(wrapper.find('[data-el="expert-home"]').classes()).not.toContain('is-conversing')

        mocks.expertStore.messages = [{ _type: 'human' }]
        await wrapper.vm.$nextTick()

        const root = wrapper.find('[data-el="expert-home"]')
        expect(root.attributes('data-stage')).toBe('conversing')
        expect(root.classes()).toContain('is-conversing')
    })

    test('back returns to idle from either stage', async () => {
        mocks.expertStore.messages = []
        const wrapper = await mountPage()
        await wrapper.find('[data-el="expert-home-surface"]').trigger('input')

        await wrapper.find('[data-action="collapse-expert"]').trigger('click')
        expect(wrapper.find('[data-el="expert-home"]').attributes('data-stage')).toBe('idle')

        mocks.expertStore.messages = [{ _type: 'human' }]
        await wrapper.vm.$nextTick()
        expect(wrapper.find('[data-el="expert-home"]').attributes('data-stage')).toBe('conversing')

        await wrapper.find('[data-action="collapse-expert"]').trigger('click')
        expect(wrapper.find('[data-el="expert-home"]').attributes('data-stage')).toBe('idle')
    })

    test('the composer is never unmounted across any stage change', async () => {
        mocks.expertStore.messages = []
        const wrapper = await mountPage()
        const before = wrapper.findComponent({ name: 'ExpertPanel' })

        await wrapper.find('[data-el="expert-home-surface"]').trigger('input')
        mocks.expertStore.messages = [{ _type: 'human' }]
        await wrapper.vm.$nextTick()
        await wrapper.find('[data-action="collapse-expert"]').trigger('click')

        expect(wrapper.findComponent({ name: 'ExpertPanel' }).vm).toBe(before.vm)
    })

    test('keeps the back control mounted so the column does not reflow mid-animation', async () => {
        mocks.expertStore.messages = []
        const wrapper = await mountPage()
        expect(wrapper.find('[data-action="collapse-expert"]').exists()).toBe(true)

        await wrapper.find('[data-el="expert-home-surface"]').trigger('input')
        expect(wrapper.find('[data-action="collapse-expert"]').exists()).toBe(true)
    })

    test('forces Support mode only when Insights is unavailable', async () => {
        mocks.settingsStore.featuresCheck = {
            isExpertAssistantFeatureEnabled: true,
            isExpertInsightsFeatureEnabled: false
        }
        mocks.expertStore.setAgentMode.mockClear()
        await mountPage()
        expect(mocks.expertStore.setAgentMode).toHaveBeenCalledWith('support-agent')
    })

    test('leaves the mode alone when both are available, matching openAssistantDrawer', async () => {
        // agentMode persists to sessionStorage and this page offers no toggle, so forcing
        // it here would strand an Insights user in Support everywhere
        mocks.settingsStore.featuresCheck = {
            isExpertAssistantFeatureEnabled: true,
            isExpertInsightsFeatureEnabled: true
        }
        mocks.expertStore.setAgentMode.mockClear()
        await mountPage()
        expect(mocks.expertStore.setAgentMode).not.toHaveBeenCalled()
    })

    test('resumes the session expiry timer, which only openAssistantDrawer otherwise does', async () => {
        // Expert.vue clears the interval on unmount and sessionStartTime is persisted, so
        // without this a returning user types into a session that has silently expired
        mocks.expertStore.resumeSessionTimer.mockClear()
        await mountPage()
        expect(mocks.expertStore.resumeSessionTimer).toHaveBeenCalledTimes(1)
    })

    test('offers the mode toggle when both agents are available', async () => {
        mocks.settingsStore.featuresCheck = {
            isExpertAssistantFeatureEnabled: true,
            isExpertInsightsFeatureEnabled: true
        }
        const wrapper = await mountPage()
        expect(wrapper.find('[data-stub="mode-switcher"]').exists()).toBe(true)
    })

    test('hides the mode toggle when there is only one agent to pick', async () => {
        mocks.settingsStore.featuresCheck = {
            isExpertAssistantFeatureEnabled: true,
            isExpertInsightsFeatureEnabled: false
        }
        const wrapper = await mountPage()
        expect(wrapper.find('[data-stub="mode-switcher"]').exists()).toBe(false)
    })
})
