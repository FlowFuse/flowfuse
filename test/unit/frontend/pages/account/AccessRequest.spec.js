import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, vi } from 'vitest'

vi.mock('@/stores/account-auth.js', () => ({
    useAccountAuthStore: () => ({ user: null })
}))
// The complete and reject routes return the client callback url. Use a hash change
// on the current page so jsdom can follow it without attempting a real navigation.
const { mockPut } = vi.hoisted(() => ({
    mockPut: vi.fn(async () => ({ data: { redirect: `${window.location.origin}${window.location.pathname}#callback` } }))
}))
vi.mock('@/api/client.ts', () => ({
    default: { put: mockPut }
}))

// imported after mocks so vi.mock hoisting resolves correctly
import AccessRequest from '../../../../../frontend/src/pages/account/AccessRequest.vue'
import FFUIComponents from '../../../../../frontend/src/ui-components/index.js'

beforeEach(() => {
    mockPut.mockClear()
    window.location.hash = ''
})

function mountPage () {
    return mount(AccessRequest, {
        global: {
            plugins: [FFUIComponents],
            mocks: {
                $router: { currentRoute: { value: { params: { id: 'request-id' } } } }
            }
        }
    })
}

describe('AccessRequest', () => {
    test('allow completes the request and follows the returned redirect', async () => {
        const wrapper = mountPage()
        await wrapper.find('[data-action="allow-access"]').trigger('click')
        await flushPromises()

        expect(mockPut.mock.calls[0][0]).toBe('/account/complete/request-id')
        expect(window.location.hash).toBe('#callback')
    })

    test('deny rejects the request and follows the returned redirect', async () => {
        const wrapper = mountPage()
        await wrapper.find('[data-action="deny-access"]').trigger('click')
        await flushPromises()

        expect(mockPut.mock.calls[0][0]).toBe('/account/reject/request-id')
        expect(window.location.hash).toBe('#callback')
    })

    test('shows the error when the request can no longer be completed', async () => {
        mockPut.mockRejectedValueOnce({ response: { data: { error: 'invalid_request', description: 'Invalid request' } } })
        const wrapper = mountPage()
        await wrapper.find('[data-action="allow-access"]').trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('Invalid request')
        expect(window.location.hash).toBe('')
    })
})
