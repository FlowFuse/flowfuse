import { flushPromises, mount } from '@vue/test-utils'
import { expect, vi } from 'vitest'

vi.mock('@/stores/account-auth.js', () => ({
    useAccountAuthStore: () => ({ user: null })
}))
vi.mock('@/api/team.ts', () => ({
    default: {
        getTeams: vi.fn().mockResolvedValue({
            teams: [
                { id: 'team-1', name: 'Team One' },
                { id: 'team-2', name: 'Team Two' }
            ]
        })
    }
}))
vi.mock('@/api/client.ts', () => ({
    default: { put: vi.fn().mockResolvedValue({}) }
}))

// imported after mocks so vi.mock hoisting resolves correctly
import AccessRequestMCP from '../../../../../frontend/src/pages/account/AccessRequestMCP.vue'
import FFUIComponents from '../../../../../frontend/src/ui-components/index.js'

async function mountPage () {
    const wrapper = mount(AccessRequestMCP, {
        global: {
            plugins: [FFUIComponents],
            mocks: {
                $router: { currentRoute: { value: { params: { id: 'request-id' } } } }
            }
        }
    })
    await flushPromises()
    return wrapper
}

function findRadio (wrapper, label) {
    return wrapper.findAll('.ff-radio-btn').find(r => r.text().includes(label))
}

function allowButton (wrapper) {
    return wrapper.find('[data-action="allow-access"]')
}

describe('AccessRequestMCP', () => {
    test('does not preselect an access level or team scope', async () => {
        const wrapper = await mountPage()

        const checked = wrapper.findAll('.ff-radio-btn .checkbox')
            .filter(c => c.attributes('checked') === 'true')
        expect(checked.length).toBe(0)
    })

    test('disables Allow until both access level and team scope are chosen', async () => {
        const wrapper = await mountPage()

        expect(allowButton(wrapper).attributes('disabled')).toBeDefined()

        await findRadio(wrapper, 'Full access').trigger('click')
        expect(allowButton(wrapper).attributes('disabled')).toBeDefined()

        await findRadio(wrapper, 'All teams').trigger('click')
        expect(allowButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    test('keeps Allow disabled for specific teams until a team is selected', async () => {
        const wrapper = await mountPage()

        await findRadio(wrapper, 'Read-only').trigger('click')
        await findRadio(wrapper, 'Specific teams').trigger('click')
        expect(allowButton(wrapper).attributes('disabled')).toBeDefined()

        const teamCheckbox = wrapper.findAll('.ff-checkbox').find(c => c.text().includes('Team One'))
        await teamCheckbox.find('label').trigger('click')
        expect(allowButton(wrapper).attributes('disabled')).toBeUndefined()
    })
})
