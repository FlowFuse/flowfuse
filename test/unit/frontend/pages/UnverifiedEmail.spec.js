import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    return {
        authStore: { user: { username: 'alice' } },
        settingsStore: { featuresCheck: {} },
        toursStore: { presentTour: vi.fn() },
        uxStore: { setNewlyCreatedUser: vi.fn() }
    }
})

vi.mock('@/stores/account-auth.js', () => ({
    useAccountAuthStore: () => mocks.authStore
}))
vi.mock('@/stores/account-settings.js', () => ({
    useAccountSettingsStore: () => mocks.settingsStore
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
        mocks.settingsStore.featuresCheck = {}
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

    test('queues the welcome tour on the classic path', async () => {
        const wrapper = mountPage()
        await verify(wrapper)
        expect(mocks.toursStore.presentTour).toHaveBeenCalledTimes(1)
    })

    // The tour and the education modal it opens on close both explain concepts
    // the onboarding conversation covers by doing
    test('does not queue the welcome tour when AI onboarding is enabled', async () => {
        mocks.settingsStore.featuresCheck = { isAiOnboardingFeatureEnabled: true }
        const wrapper = mountPage()
        await verify(wrapper)
        expect(mocks.toursStore.presentTour).not.toHaveBeenCalled()
    })

    test('still marks the user as newly created either way', async () => {
        mocks.settingsStore.featuresCheck = { isAiOnboardingFeatureEnabled: true }
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
