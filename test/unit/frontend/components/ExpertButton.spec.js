import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

const emit = vi.fn()

// The stores are mocked rather than instantiated: this covers the team watcher, and the
// real ones drag in the orchestrator and the whole expert tree to get there.
const mcpStore = reactive({
    active: false,
    status: 'off',
    clientCount: 0,
    enable: vi.fn(),
    disable: vi.fn(() => Promise.resolve(true)),
    resume: vi.fn()
})

const contextStore = reactive({ team: null })

const accountSettingsStore = reactive({
    featuresCheck: {
        isAiFeatureEnabled: true,
        isMcpThirdPartyFeatureEnabled: true,
        isExpertAssistantFeatureEnabled: true,
        isExpertInsightsFeatureEnabled: true
    }
})

const uxDrawersStore = reactive({
    rightDrawer: { state: false, fixed: false, expertState: { pinned: false } }
})

const expertStore = reactive({ openAssistantDrawer: vi.fn() })

vi.mock('@/stores/product-mcp.js', () => ({ useProductMcpStore: () => mcpStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore: () => contextStore }))
vi.mock('@/stores/account-settings.js', () => ({ useAccountSettingsStore: () => accountSettingsStore }))
vi.mock('@/stores/ux-drawers.js', () => ({ useUxDrawersStore: () => uxDrawersStore }))
vi.mock('@/stores/product-expert.js', () => ({ useProductExpertStore: () => expertStore }))
vi.mock('@/services/alerts.js', () => ({ default: { emit: (...args) => emit(...args) } }))

// imported after mocks so vi.mock hoisting resolves correctly
import ExpertButton from '../../../../frontend/src/components/ExpertButton.vue'

const TEAM = { id: 'team-1', slug: 'team-one' }

// A live button keeps watching the shared context store, so each one is torn down after
// its test - otherwise a leaked mount answers the next test's team change too.
let mounted = []

function mountButton () {
    const wrapper = mount(ExpertButton, {
        global: {
            directives: { 'ff-tooltip': {} }
        }
    })
    mounted.push(wrapper)
    return wrapper
}

describe('ExpertButton', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mcpStore.active = false
        mcpStore.status = 'off'
        mcpStore.clientCount = 0
        contextStore.team = null
    })

    afterEach(() => {
        mounted.forEach(wrapper => wrapper.unmount())
        mounted = []
    })

    describe('team watcher', () => {
        it('resumes when the first team resolves', async () => {
            mcpStore.active = true
            const wrapper = mountButton()

            contextStore.team = TEAM
            await wrapper.vm.$nextTick()

            expect(mcpStore.resume).toHaveBeenCalledWith(TEAM)
            expect(mcpStore.disable).not.toHaveBeenCalled()
        })

        it('leaves the session up when the same team is refreshed', async () => {
            contextStore.team = TEAM
            mcpStore.active = true
            const wrapper = mountButton()

            // What refreshActiveTeam() does on a `t/updated`: a fresh object off the API
            // carrying the same id. Same team, so nothing should be torn down.
            contextStore.team = { ...TEAM, name: 'renamed' }
            await wrapper.vm.$nextTick()

            expect(mcpStore.disable).not.toHaveBeenCalled()
            expect(emit).not.toHaveBeenCalled()
        })

        it('closes the session when the team actually changes', async () => {
            contextStore.team = TEAM
            mcpStore.active = true
            const wrapper = mountButton()

            contextStore.team = { id: 'team-2', slug: 'team-two' }
            await wrapper.vm.$nextTick()
            await wrapper.vm.$nextTick()

            expect(mcpStore.disable).toHaveBeenCalled()
            expect(emit).toHaveBeenCalledWith('MCP session closed due to team switch.', 'info')
        })

        it('stays out of the way when the tab is not exposed', async () => {
            contextStore.team = TEAM
            mcpStore.active = false
            const wrapper = mountButton()
            // mounting always offers a resume; the store declines while inactive
            mcpStore.resume.mockClear()

            contextStore.team = { id: 'team-2', slug: 'team-two' }
            await wrapper.vm.$nextTick()

            expect(mcpStore.disable).not.toHaveBeenCalled()
            expect(mcpStore.resume).not.toHaveBeenCalled()
        })
    })
})
