import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    return {
        authStore: { user: { username: 'alice' } },
        toursStore: { presentTour: vi.fn() },
        uxStore: { setNewlyCreatedUser: vi.fn() }
    }
})

vi.mock('@/stores/account-auth.js', () => ({
    useAccountAuthStore: () => mocks.authStore
}))
vi.mock('@/stores/ux-tours.js', () => ({
    useUxToursStore: () => mocks.toursStore
}))
vi.mock('@/stores/ux.js', () => ({
    useUxStore: () => mocks.uxStore
}))
vi.mock('../../../../frontend/src/api/user.js', () => ({
    default: {
        verifyEmailToken: vi.fn().mockResolvedValue({}),
        triggerVerification: vi.fn().mockResolvedValue({})
    }
}))
vi.mock('../../../../frontend/src/layouts/Box.vue', () => ({
    default: { name: 'FFLayoutBox', template: '<div><slot /><slot name="content" /></div>' }
}))

// imported after mocks so vi.mock hoisting resolves correctly
import userApi from '../../../../frontend/src/api/user.js'
import UnverifiedEmail from '../../../../frontend/src/pages/UnverifiedEmail.vue'

const routerGo = vi.fn()

function mountPage () {
    return mount(UnverifiedEmail, {
        global: {
            stubs: { 'ff-button': true, 'ff-text-input': true },
            mocks: { $router: { go: routerGo } }
        }
    })
}

describe('UnverifiedEmail', () => {
    beforeEach(() => {
        mocks.toursStore.presentTour.mockClear()
        mocks.uxStore.setNewlyCreatedUser.mockClear()
        userApi.verifyEmailToken.mockClear()
        userApi.verifyEmailToken.mockResolvedValue({})
        routerGo.mockClear()
    })

    async function verify (wrapper) {
        wrapper.vm.token = 'a-token'
        await wrapper.vm.submitVerificationToken()
        await flushPromises()
    }

    // No team is loaded for an unverified user, so the team page decides whether the tour fits
    test('queues the welcome tour once verified', async () => {
        const wrapper = mountPage()
        await verify(wrapper)
        expect(mocks.toursStore.presentTour).toHaveBeenCalledTimes(1)
    })

    test('marks the user as newly created', async () => {
        const wrapper = mountPage()
        await verify(wrapper)
        expect(mocks.uxStore.setNewlyCreatedUser).toHaveBeenCalledTimes(1)
        expect(routerGo).toHaveBeenCalledTimes(1)
    })

    test('queues nothing when verification fails', async () => {
        userApi.verifyEmailToken.mockRejectedValue(new Error('nope'))
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const wrapper = mountPage()
        await verify(wrapper)
        expect(mocks.toursStore.presentTour).not.toHaveBeenCalled()
        expect(mocks.uxStore.setNewlyCreatedUser).not.toHaveBeenCalled()
    })
})
