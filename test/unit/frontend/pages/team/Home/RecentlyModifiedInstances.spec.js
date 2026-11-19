import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    hasPermission: vi.fn()
}))

vi.mock('@/stores/context.js', () => ({ useContextStore: () => ({ team: { id: 't1', slug: 'ateam' } }) }))
vi.mock('@/composables/Permissions.js', () => ({ default: () => ({ hasPermission: mocks.hasPermission }) }))
vi.mock('@/api/team.js', () => ({ default: { getInstances: vi.fn().mockResolvedValue({ projects: [] }) } }))
vi.mock('@/components/expert/ExpertBuildButton.vue', () => ({
    default: { name: 'ExpertBuildButton', template: '<div data-stub="build" />' }
}))

// imported after mocks so vi.mock hoisting resolves correctly
import RecentlyModifiedInstances from '../../../../../../frontend/src/pages/team/Home/components/RecentlyModifiedInstances.vue'

async function mountEmpty () {
    const wrapper = mount(RecentlyModifiedInstances, {
        props: { totalInstances: 0 },
        global: { stubs: { TeamLink: true, InstanceTile: true } }
    })
    await flushPromises()
    return wrapper
}

describe('RecentlyModifiedInstances', () => {
    beforeEach(() => {
        mocks.hasPermission.mockReset()
    })

    test('offers Build on the empty state to people who can create instances', async () => {
        mocks.hasPermission.mockImplementation(scope => scope === 'project:create')
        const wrapper = await mountEmpty()
        expect(wrapper.find('[data-stub="build"]').exists()).toBe(true)
    })

    test('hides Build from people who cannot create instances', async () => {
        mocks.hasPermission.mockReturnValue(false)
        const wrapper = await mountEmpty()
        expect(wrapper.text()).toContain("It's looking a little empty.")
        expect(wrapper.find('[data-stub="build"]').exists()).toBe(false)
    })
})
