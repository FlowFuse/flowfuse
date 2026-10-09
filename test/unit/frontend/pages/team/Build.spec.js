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
    expertStore: { messages: [], openConversation: vi.fn(), setAgentMode: vi.fn(), setPlanMode: vi.fn(), startOver: vi.fn().mockResolvedValue() },
    supportAgentStore: { messages: [], reset: vi.fn() },
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
                $route: { params: { team_slug: 'ateam' }, path: '/team/ateam/instances/build', query: {}, hash: '' },
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
        mocks.expertStore.messages = []
        mocks.supportAgentStore.messages = []
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

    test('opens the support agent conversation itself, with building and plan mode on', async () => {
        await mountPage()
        expect(mocks.uxStore.startBuilding).toHaveBeenCalledTimes(1)
        expect(mocks.expertStore.setPlanMode).toHaveBeenCalledWith(true)
        expect(mocks.expertStore.setAgentMode).toHaveBeenCalledWith(SUPPORT_AGENT)
        expect(mocks.expertStore.openConversation).toHaveBeenCalledTimes(1)
        // both have to be on before the first turn goes out
        const opened = mocks.expertStore.openConversation.mock.invocationCallOrder[0]
        expect(mocks.uxStore.startBuilding.mock.invocationCallOrder[0]).toBeLessThan(opened)
        expect(mocks.expertStore.setPlanMode.mock.invocationCallOrder[0]).toBeLessThan(opened)
    })

    // The agent keeps history per session, so a build has to start a new one
    // or it would carry over whatever was said in the drawer
    test('starts a fresh chat on the support agent before opening the turn', async () => {
        await mountPage()
        expect(mocks.expertStore.startOver).toHaveBeenCalledTimes(1)
        const startedOver = mocks.expertStore.startOver.mock.invocationCallOrder[0]
        expect(mocks.expertStore.setAgentMode.mock.invocationCallOrder[0]).toBeLessThan(startedOver)
        expect(startedOver).toBeLessThan(mocks.expertStore.openConversation.mock.invocationCallOrder[0])
    })

    test('drops the welcome message so the agent reply comes first', async () => {
        mocks.expertStore.startOver.mockImplementationOnce(async () => {
            mocks.supportAgentStore.messages = [{ _type: 'ai', generated: true }]
        })
        await mountPage()
        expect(mocks.supportAgentStore.messages).toEqual([])
        expect(mocks.expertStore.openConversation).toHaveBeenCalledTimes(1)
    })

    test('clears building and plan mode however the page is left', async () => {
        const wrapper = await mountPage()
        mocks.expertStore.setPlanMode.mockClear()
        wrapper.unmount()
        expect(mocks.uxStore.stopBuilding).toHaveBeenCalledTimes(1)
        expect(mocks.expertStore.setPlanMode).toHaveBeenCalledWith(false)
    })

    test('Back goes to team home when there is no history to return to', async () => {
        const wrapper = await mountPage()
        await wrapper.find('[data-action="leave-build"]').trigger('click')
        expect(routerPush).toHaveBeenCalledWith({ name: 'team-home', params: { team_slug: 'ateam' } })
        expect(routerBack).not.toHaveBeenCalled()
    })
})
