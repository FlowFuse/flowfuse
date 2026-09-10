import { flushPromises, mount } from '@vue/test-utils'
import { expect, vi } from 'vitest'

vi.mock('@/api/user.js', () => ({
    default: {
        getPersonalAccessTokens: vi.fn().mockResolvedValue({
            count: 2,
            tokens: [
                { id: 'plain', name: 'Plain Token', expiresAt: null, readOnly: false, adminOptIn: false, teams: [] },
                {
                    id: 'mcp',
                    name: 'MCP Agent',
                    expiresAt: null,
                    readOnly: true,
                    adminOptIn: false,
                    teams: [],
                    autoRenews: { every: 1000 * 60 * 30, until: '2027-01-01T00:00:00.000Z', chosen: true }
                }
            ]
        })
    }
}))
vi.mock('@/stores/account-auth.js', () => ({
    useAccountAuthStore: () => ({ isAdminUser: false })
}))
vi.mock('@/pages/account/Security/dialogs/TokenDialog.vue', () => ({
    default: { name: 'TokenDialog', template: '<div />' }
}))
vi.mock('@/pages/account/Security/dialogs/TokenCreated.vue', () => ({
    default: { name: 'TokenCreated', template: '<div />' }
}))

// imported after mocks so vi.mock hoisting resolves correctly
import Tokens from '../../../../../frontend/src/pages/account/Security/Tokens.vue'
import FFUIComponents from '../../../../../frontend/src/ui-components/index.js'

async function mountPage () {
    const wrapper = mount(Tokens, {
        attachTo: document.body,
        global: {
            plugins: [FFUIComponents],
            stubs: { SectionTopMenu: true }
        }
    })
    await flushPromises()
    return wrapper
}

async function openKebabForRow (wrapper, name) {
    const row = wrapper.findAll('tr').find(r => r.text().includes(name))
    await row.find('.ff-kebab-menu__trigger').trigger('click')
    await flushPromises()
}

describe('PersonalAccessTokens', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    test('offers edit and delete for a plain token', async () => {
        const wrapper = await mountPage()
        await openKebabForRow(wrapper, 'Plain Token')

        expect(document.body.querySelector('[data-action="edit-token"]')).not.toBeNull()
        expect(document.body.querySelector('[data-action="delete-token"]')).not.toBeNull()
    })

    test('offers delete but not edit for an auto-renewing token', async () => {
        const wrapper = await mountPage()
        await openKebabForRow(wrapper, 'MCP Agent')

        expect(document.body.querySelector('[data-action="edit-token"]')).toBeNull()
        expect(document.body.querySelector('[data-action="delete-token"]')).not.toBeNull()
    })
})
