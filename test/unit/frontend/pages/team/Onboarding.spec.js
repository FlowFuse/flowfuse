import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { reactive } from 'vue'

const mocks = vi.hoisted(() => {
    return {
        contextStore: { team: null },
        settingsStore: { featuresCheck: {} },
        accountStore: { setTeam: vi.fn().mockResolvedValue() },
        expertStore: { messages: [], hydrateMessages: vi.fn() },
        supportAgentStore: { reset: vi.fn() },
        uxStore: { isOnboardingIntake: true, endOnboarding: vi.fn() }
    }
})

vi.mock('@/stores/context.js', () => ({
    useContextStore: () => mocks.contextStore
}))
vi.mock('@/stores/account-settings.js', () => ({
    useAccountSettingsStore: () => mocks.settingsStore
}))
vi.mock('@/stores/account.js', () => ({
    useAccountStore: () => mocks.accountStore
}))
vi.mock('@/stores/product-expert.js', () => ({
    useProductExpertStore: () => mocks.expertStore
}))
vi.mock('@/stores/product-expert-support-agent.js', () => ({
    useProductExpertSupportAgentStore: () => mocks.supportAgentStore
}))
vi.mock('@/stores/ux.js', () => ({
    useUxStore: () => mocks.uxStore
}))
// The real panel drags in the whole expert component tree (including
// @flowfuse/flow-renderer, which does not load under vitest); the page only
// needs to decide whether to mount it.
vi.mock('@/components/expert/Expert.vue', () => ({
    default: { name: 'ExpertPanel', template: '<div data-stub="expert-panel" />' }
}))
vi.mock('@/api/team.ts', () => ({
    default: {
        provisionDefaultWorkspace: vi.fn().mockResolvedValue({ application: {}, instance: {} })
    }
}))

// imported after mocks so vi.mock hoisting resolves correctly
import teamApi from '../../../../../frontend/src/api/team.ts'

// imported after mocks so vi.mock hoisting resolves correctly
import Onboarding from '../../../../../frontend/src/pages/team/Onboarding.vue'

// The store mocks are plain objects, so the page's computeds would never see a
// change. The mock factories read this property when called, so swapping in a
// reactive version here is picked up.
mocks.expertStore = reactive(mocks.expertStore)

const routerPush = vi.fn()
const routerReplace = vi.fn()

async function mountPage () {
    const wrapper = mount(Onboarding, {
        global: {
            stubs: {
                // render teleported content in place so it is findable
                teleport: true
            },
            mocks: {
                $route: {
                    params: { team_slug: 'ateam' },
                    path: '/team/ateam/onboarding',
                    query: {},
                    hash: ''
                },
                $router: { push: routerPush, replace: routerReplace }
            }
        }
    })
    await flushPromises()
    return wrapper
}

describe('Onboarding page', () => {
    beforeEach(() => {
        mocks.contextStore.team = { id: 't1', slug: 'ateam', instanceCount: 0 }
        mocks.settingsStore.featuresCheck = { isAiOnboardingFeatureEnabled: true }
        mocks.accountStore.setTeam.mockClear()
        mocks.uxStore.isOnboardingIntake = true
        mocks.uxStore.endOnboarding.mockClear()
        routerReplace.mockClear()
    })

    test('resolves the team from the route slug', async () => {
        await mountPage()
        expect(mocks.accountStore.setTeam).toHaveBeenCalledWith('ateam')
    })

    test('renders the onboarding surface for an empty team with the flag on', async () => {
        const wrapper = await mountPage()
        expect(wrapper.find('[data-stub="expert-panel"]').exists()).toBe(true)
        expect(routerReplace).not.toHaveBeenCalled()
    })

    test('redirects to the 404 page when the aiOnboarding feature is off', async () => {
        mocks.settingsStore.featuresCheck = { isAiOnboardingFeatureEnabled: false }
        const wrapper = await mountPage()
        expect(routerReplace).toHaveBeenCalledTimes(1)
        expect(routerReplace).toHaveBeenCalledWith(expect.objectContaining({ name: 'page-not-found' }))
        expect(wrapper.find('[data-stub="expert-panel"]').exists()).toBe(false)
    })

    test('redirects to the 404 page once onboarding has moved past intake', async () => {
        mocks.uxStore.isOnboardingIntake = false
        const wrapper = await mountPage()
        expect(routerReplace).toHaveBeenCalledTimes(1)
        expect(routerReplace).toHaveBeenCalledWith(expect.objectContaining({ name: 'page-not-found' }))
        expect(wrapper.find('[data-stub="expert-panel"]').exists()).toBe(false)
    })

    // The Expert provisions the workspace partway through the conversation, so
    // an instance appearing must not throw the user off the page they are on
    test('stays available once the workspace has been provisioned', async () => {
        mocks.contextStore.team = { id: 't1', slug: 'ateam', instanceCount: 2 }
        const wrapper = await mountPage()
        expect(routerReplace).not.toHaveBeenCalled()
        expect(wrapper.find('[data-stub="expert-panel"]').exists()).toBe(true)
    })

    test('replaces rather than pushes, so the user cannot go back into onboarding', async () => {
        mocks.settingsStore.featuresCheck = { isAiOnboardingFeatureEnabled: false }
        await mountPage()
        expect(routerPush).not.toHaveBeenCalled()
        expect(routerReplace).toHaveBeenCalledWith(expect.objectContaining({
            params: { pathMatch: ['team', 'ateam', 'onboarding'] }
        }))
    })

    test('renders nothing and does not redirect while the team is still loading', async () => {
        mocks.contextStore.team = null
        const wrapper = await mountPage()
        expect(wrapper.find('[data-stub="expert-panel"]').exists()).toBe(false)
        expect(routerReplace).not.toHaveBeenCalled()
    })

    test('provides the onboarding surface variant to the expert components', async () => {
        const wrapper = await mountPage()
        expect(wrapper.vm.$options.provide.call(wrapper.vm)['expert-surface']).toBe('onboarding')
    })

    describe('fixture transcript', () => {
        beforeEach(() => {
            mocks.expertStore.hydrateMessages.mockClear()
            mocks.supportAgentStore.reset.mockClear()
            mocks.expertStore.messages = []
        })

        test('seeds the placeholder conversation when the transcript is empty', async () => {
            await mountPage()
            expect(mocks.expertStore.hydrateMessages).toHaveBeenCalledTimes(1)
            const seeded = mocks.expertStore.hydrateMessages.mock.calls[0][0]
            expect(Array.isArray(seeded)).toBe(true)
            expect(seeded.length).toBeGreaterThan(0)
            expect(mocks.supportAgentStore.reset).not.toHaveBeenCalled()
        })

        test('replaces a transcript that only holds canned messages', async () => {
            mocks.expertStore.messages = [{ _type: 'ai', generated: true }]
            await mountPage()
            expect(mocks.supportAgentStore.reset).toHaveBeenCalledTimes(1)
            expect(mocks.expertStore.hydrateMessages).toHaveBeenCalledTimes(1)
        })

        test('does not reseed a real conversation', async () => {
            mocks.expertStore.messages = [{ _type: 'human', content: 'hello' }]
            await mountPage()
            expect(mocks.expertStore.hydrateMessages).not.toHaveBeenCalled()
            expect(mocks.supportAgentStore.reset).not.toHaveBeenCalled()
        })

        test('does not seed when the page is redirecting away', async () => {
            mocks.settingsStore.featuresCheck = { isAiOnboardingFeatureEnabled: false }
            await mountPage()
            expect(mocks.expertStore.hydrateMessages).not.toHaveBeenCalled()
        })
    })

    describe('escape hatch', () => {
        beforeEach(() => {
            teamApi.provisionDefaultWorkspace.mockClear()
            teamApi.provisionDefaultWorkspace.mockResolvedValue({ application: {}, instance: {} })
            routerPush.mockClear()
        })

        test('offers a way out of onboarding', async () => {
            const wrapper = await mountPage()
            expect(wrapper.find('[data-action="skip-onboarding"]').exists()).toBe(true)
        })

        // A seeded or resumed transcript is not the user engaging, so the
        // control has to stay at full weight until they contribute a turn
        test('stays prominent until the user contributes a turn', async () => {
            mocks.expertStore.messages = [
                { _type: 'ai', generated: true },
                { _type: 'human', content: 'seeded' }
            ]
            const wrapper = await mountPage()
            expect(wrapper.find('[data-action="skip-onboarding"]').classes()).not.toContain('has-engaged')
        })

        test('recedes once the user contributes a turn', async () => {
            mocks.expertStore.messages = [{ _type: 'ai', generated: true }]
            const wrapper = await mountPage()
            expect(wrapper.find('[data-action="skip-onboarding"]').classes()).not.toContain('has-engaged')

            mocks.expertStore.messages = [
                { _type: 'ai', generated: true },
                { _type: 'human', content: 'a dashboard please' }
            ]
            await wrapper.vm.$nextTick()

            expect(wrapper.find('[data-action="skip-onboarding"]').classes()).toContain('has-engaged')
        })

        test('stays reachable after it recedes', async () => {
            mocks.expertStore.messages = []
            const wrapper = await mountPage()
            mocks.expertStore.messages = [{ _type: 'human', content: 'hello' }]
            await wrapper.vm.$nextTick()

            const control = wrapper.find('[data-action="skip-onboarding"]')
            expect(control.exists()).toBe(true)
            await control.trigger('click')
            await flushPromises()
            expect(teamApi.provisionDefaultWorkspace).toHaveBeenCalledWith('t1')
        })

        test('provisions the default workspace and lands on the team home', async () => {
            const wrapper = await mountPage()
            await wrapper.find('[data-action="skip-onboarding"]').trigger('click')
            await flushPromises()
            expect(teamApi.provisionDefaultWorkspace).toHaveBeenCalledWith('t1')
            expect(routerPush).toHaveBeenCalledWith({ name: 'team-home', params: { team_slug: 'ateam' } })
        })

        // Without this they would be treated as mid-onboarding forever, and the
        // Expert would keep being told so on every turn
        test('ends onboarding on the way out', async () => {
            const wrapper = await mountPage()
            await wrapper.find('[data-action="skip-onboarding"]').trigger('click')
            await flushPromises()
            expect(mocks.uxStore.endOnboarding).toHaveBeenCalledTimes(1)
        })

        test('an already-provisioned team still lands on the team home', async () => {
            teamApi.provisionDefaultWorkspace.mockRejectedValue({
                response: { status: 409, data: { code: 'team_not_empty' } }
            })
            const wrapper = await mountPage()
            await wrapper.find('[data-action="skip-onboarding"]').trigger('click')
            await flushPromises()
            expect(routerPush).toHaveBeenCalledWith({ name: 'team-home', params: { team_slug: 'ateam' } })
        })

        test('does not offer the way out when the page is redirecting away', async () => {
            mocks.settingsStore.featuresCheck = { isAiOnboardingFeatureEnabled: false }
            const wrapper = await mountPage()
            expect(wrapper.find('[data-action="skip-onboarding"]').exists()).toBe(false)
        })
    })
})
