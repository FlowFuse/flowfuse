import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    return {
        contextStore: { team: null },
        settingsStore: { featuresCheck: {} },
        accountStore: { setTeam: vi.fn().mockResolvedValue() },
        expertStore: { messages: [], hydrateMessages: vi.fn() },
        supportAgentStore: { reset: vi.fn() }
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

    test('redirects to the 404 page when the team already has instances', async () => {
        mocks.contextStore.team = { id: 't1', slug: 'ateam', instanceCount: 2 }
        const wrapper = await mountPage()
        expect(routerReplace).toHaveBeenCalledTimes(1)
        expect(routerReplace).toHaveBeenCalledWith(expect.objectContaining({ name: 'page-not-found' }))
        expect(wrapper.find('[data-stub="expert-panel"]').exists()).toBe(false)
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

        test('provisions the default workspace and lands on the team home', async () => {
            const wrapper = await mountPage()
            await wrapper.find('[data-action="skip-onboarding"]').trigger('click')
            await flushPromises()
            expect(teamApi.provisionDefaultWorkspace).toHaveBeenCalledWith('t1')
            expect(routerPush).toHaveBeenCalledWith({ name: 'team-home', params: { team_slug: 'ateam' } })
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
