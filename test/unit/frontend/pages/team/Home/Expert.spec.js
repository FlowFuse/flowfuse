import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { reactive } from 'vue'

enableAutoUnmount(afterEach)

const mocks = vi.hoisted(() => ({
    accountAuthStore: { user: { name: 'Noley Holland' } },
    contextStore: { isImmersiveEditor: false },
    settingsStore: { featuresCheck: { isExpertAssistantFeatureEnabled: true, isExpertInsightsFeatureEnabled: false } },
    expertStore: {
        messages: [],
        isWaitingForResponse: false,
        isSessionExpired: false,
        isInsightsAgent: false,
        hasSelectedCapabilities: true,
        openAssistantDrawer: vi.fn(),
        handleQuery: vi.fn().mockResolvedValue(undefined),
        setPendingInput: vi.fn(),
        setAgentMode: vi.fn(),
        resumeSessionTimer: vi.fn()
    },
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

    test('hands the panel back on the way out, exactly as the user left it', async () => {
        for (const expertState of [{ pinned: true, open: true }, { pinned: false, open: true }]) {
            mocks.drawersStore.rightDrawer.expertState = { ...expertState }
            mocks.expertStore.openAssistantDrawer.mockClear()

            const wrapper = await mountPage()
            expect(mocks.expertStore.openAssistantDrawer).not.toHaveBeenCalled()

            wrapper.unmount()
            expect(mocks.expertStore.openAssistantDrawer).toHaveBeenCalledWith({ openPinned: expertState.pinned })
            expect(mocks.drawersStore.rightDrawer.expertState).toEqual(expertState)
        }

        mocks.drawersStore.rightDrawer.expertState = { pinned: false, open: false }
        mocks.expertStore.openAssistantDrawer.mockClear()
        const shut = await mountPage()
        shut.unmount()
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

    test('forces Support only when Insights is unavailable, matching openAssistantDrawer', async () => {
        // agentMode persists to sessionStorage and this page offers no toggle when there is
        // only one agent, so forcing it with both available would strand an Insights user
        mocks.settingsStore.featuresCheck = {
            isExpertAssistantFeatureEnabled: true,
            isExpertInsightsFeatureEnabled: false
        }
        mocks.expertStore.setAgentMode.mockClear()
        await mountPage()
        expect(mocks.expertStore.setAgentMode).toHaveBeenCalledWith('support-agent')

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

    test('offers the mode toggle only when there are two agents to pick between', async () => {
        mocks.settingsStore.featuresCheck = {
            isExpertAssistantFeatureEnabled: true,
            isExpertInsightsFeatureEnabled: true
        }
        expect((await mountPage()).find('[data-stub="mode-switcher"]').exists()).toBe(true)

        mocks.settingsStore.featuresCheck = {
            isExpertAssistantFeatureEnabled: true,
            isExpertInsightsFeatureEnabled: false
        }
        expect((await mountPage()).find('[data-stub="mode-switcher"]').exists()).toBe(false)
    })

    describe('the resume control', () => {
        afterEach(() => {
            mocks.expertStore.isWaitingForResponse = false
            mocks.expertStore.isSessionExpired = false
            mocks.expertStore.isInsightsAgent = false
            mocks.expertStore.hasSelectedCapabilities = true
        })

        test('is absent with nothing to return to, and counts user turns when there is', async () => {
            mocks.expertStore.messages = []
            expect((await mountPage()).find('[data-action="resume-conversation"]').exists()).toBe(false)

            mocks.expertStore.messages = [{ _type: 'human' }, { _type: 'ai' }, { _type: 'human' }]
            expect((await mountPage()).find('[data-action="resume-conversation"]').text()).toContain('2 messages')
        })

        test('appears in every state where the composer disables itself', async () => {
            // each of these hides the control that would clear it — Stop, Start over and the
            // capabilities selector all live behind the conversing stage
            const deadEnds = [
                { isWaitingForResponse: true },
                { isSessionExpired: true },
                { isInsightsAgent: true, hasSelectedCapabilities: false }
            ]
            for (const state of deadEnds) {
                Object.assign(mocks.expertStore, state)
                mocks.expertStore.messages = []
                const wrapper = await mountPage()
                expect(wrapper.find('[data-action="resume-conversation"]').exists()).toBe(true)
                mocks.expertStore.isWaitingForResponse = false
                mocks.expertStore.isSessionExpired = false
                mocks.expertStore.isInsightsAgent = false
                mocks.expertStore.hasSelectedCapabilities = true
            }
        })

        test('survives into composing, since a new message joins the same thread', async () => {
            mocks.expertStore.messages = [{ _type: 'human' }]
            const wrapper = await mountPage()
            await wrapper.find('[data-el="expert-home-surface"]').trigger('input')

            expect(wrapper.find('[data-el="expert-home"]').attributes('data-stage')).toBe('composing')
            expect(wrapper.find('[data-action="resume-conversation"]').exists()).toBe(true)
        })

        test('clicking it opens the conversation', async () => {
            mocks.expertStore.messages = [{ _type: 'human' }]
            const wrapper = await mountPage()

            await wrapper.find('[data-action="resume-conversation"]').trigger('click')

            expect(wrapper.find('[data-el="expert-home"]').attributes('data-stage')).toBe('conversing')
            expect(mocks.expertStore.messages).toHaveLength(1)
        })
    })

    describe('prompt suggestions', () => {
        test('stay under the composer across idle and composing, thread or not', async () => {
            mocks.expertStore.messages = [{ _type: 'human' }]
            const wrapper = await mountPage()
            expect(wrapper.findComponent({ name: 'PromptSuggestions' }).exists()).toBe(true)
            expect(wrapper.find('[data-action="resume-conversation"]').exists()).toBe(true)

            await wrapper.find('[data-el="expert-home-surface"]').trigger('input')
            expect(wrapper.findComponent({ name: 'PromptSuggestions' }).exists()).toBe(true)
        })

        test('go inert rather than vanish while the composer cannot take input', async () => {
            mocks.expertStore.messages = []
            mocks.expertStore.handleQuery.mockClear()
            mocks.expertStore.isWaitingForResponse = true
            const wrapper = await mountPage()

            const block = wrapper.find('.ff-expert-home__suggestions')
            expect(block.exists()).toBe(true)
            expect(block.classes()).toContain('is-inert')

            await wrapper.findComponent({ name: 'PromptSuggestions' })
                .vm.$emit('select', { title: 'x', prompt: 'anything' })
            expect(mocks.expertStore.handleQuery).not.toHaveBeenCalled()

            mocks.expertStore.isWaitingForResponse = false
        })

        test('a finished prompt sends straight away', async () => {
            mocks.expertStore.messages = []
            mocks.expertStore.handleQuery.mockClear()
            const wrapper = await mountPage()

            await wrapper.findComponent({ name: 'PromptSuggestions' })
                .vm.$emit('select', { title: 'x', prompt: 'how are my instances?' })

            expect(mocks.expertStore.handleQuery).toHaveBeenCalledWith({ query: 'how are my instances?' })
            expect(wrapper.find('[data-el="expert-home"]').attributes('data-stage')).toBe('conversing')
        })

        test('a half-finished prompt waits in the composer instead', async () => {
            mocks.expertStore.messages = []
            mocks.expertStore.handleQuery.mockClear()
            mocks.expertStore.setPendingInput.mockClear()
            const wrapper = await mountPage()

            await wrapper.findComponent({ name: 'PromptSuggestions' })
                .vm.$emit('select', { title: 'x', prompt: 'Build a flow that', needsInput: true })

            expect(mocks.expertStore.setPendingInput).toHaveBeenCalledWith('Build a flow that')
            expect(mocks.expertStore.handleQuery).not.toHaveBeenCalled()
            expect(wrapper.find('[data-el="expert-home"]').attributes('data-stage')).toBe('composing')
        })
    })
})
