import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { reactive } from 'vue'

import Build from '../../../../../frontend/src/pages/team/Build.vue'
import { SUPPORT_AGENT } from '../../../../../frontend/src/stores/product-expert-agents.js'

// The store mocks below are shared reactive state, so a page left mounted
// after its test would keep reacting to later tests' store changes
enableAutoUnmount(afterEach)

const mocks = vi.hoisted(() => ({
    contextStore: { team: null },
    settingsStore: { featuresCheck: {} },
    accountStore: { setTeam: vi.fn().mockResolvedValue() },
    expertStore: { openConversation: vi.fn(), setAgentMode: vi.fn() },
    supportAgentStore: { reset: vi.fn() },
    uxStore: { startBuilding: vi.fn(), stopBuilding: vi.fn() }
}))

vi.mock('@/stores/context.js', () => ({ useContextStore: () => mocks.contextStore }))
vi.mock('@/stores/account-settings.js', () => ({ useAccountSettingsStore: () => mocks.settingsStore }))
vi.mock('@/stores/account.js', () => ({ useAccountStore: () => mocks.accountStore }))
vi.mock('@/stores/product-expert.js', () => ({ useProductExpertStore: () => mocks.expertStore }))
vi.mock('@/stores/product-expert-support-agent.js', () => ({ useProductExpertSupportAgentStore: () => mocks.supportAgentStore }))
vi.mock('@/stores/ux.js', () => ({ useUxStore: () => mocks.uxStore }))
// The real panel drags in the whole expert component tree; the page only
// needs to decide whether to mount it and on which surface
vi.mock('@/components/expert/ExpertFullPage.vue', () => ({
    default: { name: 'ExpertFullPage', props: ['surface'], template: '<div data-stub="full-page" />' }
}))

// imported after mocks so vi.mock hoisting resolves correctly

mocks.contextStore = reactive(mocks.contextStore)
mocks.settingsStore = reactive(mocks.settingsStore)

const routerPush = vi.fn()
const routerReplace = vi.fn()
const routerBack = vi.fn()

async function mountPage () {
    const wrapper = mount(Build, {
        global: {
            stubs: {
                // render teleported content in place so it is findable
                teleport: true
            },
            mocks: {
                $route: { params: { team_slug: 'ateam' }, path: '/team/ateam/build', query: {}, hash: '' },
                $router: { push: routerPush, replace: routerReplace, back: routerBack }
            }
        }
    })
    await flushPromises()
    return wrapper
}

describe('Build page', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.contextStore.team = { id: 't1', slug: 'ateam' }
        mocks.settingsStore.featuresCheck = { isAiFeatureEnabled: true, isExpertAssistantFeatureEnabled: true }
    })

    test('resolves the team from the route slug', async () => {
        await mountPage()
        expect(mocks.accountStore.setTeam).toHaveBeenCalledWith('ateam')
    })

    test('renders the full page panel on the building surface', async () => {
        const wrapper = await mountPage()
        expect(wrapper.findComponent({ name: 'ExpertFullPage' }).props('surface')).toBe('building')
        expect(routerReplace).not.toHaveBeenCalled()
    })

    test('redirects to the 404 page when AI is off', async () => {
        mocks.settingsStore.featuresCheck = { isAiFeatureEnabled: false, isExpertAssistantFeatureEnabled: true }
        const wrapper = await mountPage()
        expect(routerReplace).toHaveBeenCalledWith(expect.objectContaining({ name: 'page-not-found' }))
        expect(wrapper.find('[data-stub="full-page"]').exists()).toBe(false)
        expect(mocks.expertStore.openConversation).not.toHaveBeenCalled()
    })

    test('redirects to the 404 page when the Expert assistant is off', async () => {
        mocks.settingsStore.featuresCheck = { isAiFeatureEnabled: true, isExpertAssistantFeatureEnabled: false }
        await mountPage()
        expect(routerReplace).toHaveBeenCalledWith(expect.objectContaining({ name: 'page-not-found' }))
    })

    test('waits for the team before doing anything', async () => {
        mocks.contextStore.team = null
        const wrapper = await mountPage()
        expect(wrapper.find('[data-stub="full-page"]').exists()).toBe(false)
        expect(routerReplace).not.toHaveBeenCalled()
        expect(mocks.expertStore.openConversation).not.toHaveBeenCalled()
    })

    test('starts a fresh support agent conversation with building on', async () => {
        await mountPage()
        expect(mocks.uxStore.startBuilding).toHaveBeenCalledTimes(1)
        expect(mocks.supportAgentStore.reset).toHaveBeenCalledTimes(1)
        expect(mocks.expertStore.setAgentMode).toHaveBeenCalledWith(SUPPORT_AGENT)
        expect(mocks.expertStore.openConversation).toHaveBeenCalledTimes(1)
        // building has to be on before the first turn goes out
        expect(mocks.uxStore.startBuilding.mock.invocationCallOrder[0])
            .toBeLessThan(mocks.expertStore.openConversation.mock.invocationCallOrder[0])
    })

    test('opens the conversation only once when the team object is refreshed', async () => {
        await mountPage()
        mocks.contextStore.team = { id: 't1', slug: 'ateam' }
        await flushPromises()
        expect(mocks.expertStore.openConversation).toHaveBeenCalledTimes(1)
    })

    test('clears the building flag however the page is left', async () => {
        const wrapper = await mountPage()
        wrapper.unmount()
        expect(mocks.uxStore.stopBuilding).toHaveBeenCalledTimes(1)
    })

    test('Back goes to team home when there is no history to return to', async () => {
        const wrapper = await mountPage()
        await wrapper.find('[data-action="leave-build"]').trigger('click')
        expect(routerPush).toHaveBeenCalledWith({ name: 'team-home', params: { team_slug: 'ateam' } })
        expect(routerBack).not.toHaveBeenCalled()
    })
})
