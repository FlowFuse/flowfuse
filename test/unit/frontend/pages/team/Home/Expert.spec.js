import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'

enableAutoUnmount(afterEach)

const mocks = vi.hoisted(() => ({
    accountAuthStore: { user: { name: 'Noley Holland' } },
    contextStore: { isImmersiveEditor: false },
    expertStore: { openAssistantDrawer: vi.fn() },
    drawersStore: {
        rightDrawer: { state: false, expertState: { pinned: true, open: true }, expertSuppressed: false },
        suppressExpertDrawer: vi.fn(),
        releaseExpertDrawer: vi.fn(),
        closeRightDrawer: vi.fn()
    }
}))

vi.mock('@/stores/account-auth.js', () => ({ useAccountAuthStore: () => mocks.accountAuthStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore: () => mocks.contextStore }))
vi.mock('@/stores/product-expert.js', () => ({ useProductExpertStore: () => mocks.expertStore }))
vi.mock('@/stores/ux-drawers.js', () => ({ useUxDrawersStore: () => mocks.drawersStore }))

import ExpertPage from '../../../../../../frontend/src/pages/team/Home/Expert/index.vue'

async function mountPage () {
    const wrapper = mount(ExpertPage, {
        global: {
            stubs: {
                // A `true` stub drops the default slot, so the whole page body would
                // never render; these pass their children through
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

        // RightDrawer's own restore runs behind a 25ms timeout, so a synchronous
        // suppress during mount always wins regardless of layout template order
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
})
