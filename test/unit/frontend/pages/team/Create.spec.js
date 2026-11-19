import { createTestingPinia } from '@pinia/testing'
import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, expect, test, vi } from 'vitest'

import client from '../../../../../frontend/src/api/client.ts'
import teamTypesApi from '../../../../../frontend/src/api/teamTypes.js'
import CreateTeam from '../../../../../frontend/src/pages/team/create.vue'

enableAutoUnmount(afterEach)
afterEach(() => vi.restoreAllMocks())

async function submitTeam (error) {
    vi.spyOn(CreateTeam.methods, 'checkSlug').mockImplementation(() => {})
    vi.spyOn(teamTypesApi, 'getTeamTypes').mockResolvedValue({ types: [{ id: 'type1', name: 'Starter', properties: {} }] })
    const post = vi.spyOn(client, 'post').mockRejectedValue({ response: { status: 400, data: { error } } })
    const wrapper = shallowMount(CreateTeam, {
        global: {
            plugins: [createTestingPinia({ createSpy: vi.fn, initialState: { 'account-settings': { features: { billing: false } } } })],
            stubs: {
                'ff-page': { template: '<div><slot /></div>' },
                'ff-page-header': true,
                'ff-loading': true,
                'ff-tile-selection': true,
                'ff-tile-selection-option': true,
                'ff-toggle-switch': true,
                'ff-button': true
            },
            mocks: { $route: { query: {} }, $router: { push: vi.fn() } }
        }
    })
    await flushPromises()
    await wrapper.setData({ input: { name: 'Development', slug: 'development' } })
    wrapper.vm.createTeam()
    await flushPromises()
    expect(post).toHaveBeenCalledWith('/api/v1/teams/', expect.objectContaining({ name: 'Development', slug: 'development' }))
    expect(wrapper.vm.loading).toBe(false)
    return wrapper
}

test('shows the license limit error returned by team creation', async () => {
    const wrapper = await submitTeam('Error: license limit reached')
    expect(wrapper.get('[role="alert"]').text()).toContain('license limit reached')
    expect(wrapper.vm.input.slugError).toBe('')
})

test('keeps duplicate slug errors on the slug field', async () => {
    const wrapper = await submitTeam('slug must be unique')
    expect(wrapper.vm.input.slugError).toBe('Slug already in use')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
})
