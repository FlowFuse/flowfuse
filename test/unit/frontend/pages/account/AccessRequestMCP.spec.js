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
const { mockPut } = vi.hoisted(() => ({ mockPut: vi.fn().mockResolvedValue({}) }))
vi.mock('@/api/client.ts', () => ({
    default: { put: mockPut }
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

function defaultGridCheckboxes (wrapper) {
    return wrapper.find('[data-el="mcp-tool-permissions"]')
}

function checkboxIn (row, column) {
    return row.findAll('.ff-checkbox')[column]
}

async function setExpiry (wrapper, value) {
    await wrapper.find('[data-form="expiry-date"] input').setValue(value)
}

function futureDate (days) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

describe('AccessRequestMCP', () => {
    test('does not preselect a team scope', async () => {
        const wrapper = await mountPage()

        const checked = wrapper.findAll('.ff-radio-btn')
            .filter(r => r.find('.checkbox').attributes('checked') === 'true')
        expect(checked).toEqual([])
    })

    test('pre-selects read and write for platform, and every category for flow building', async () => {
        const wrapper = await mountPage()
        const grid = defaultGridCheckboxes(wrapper)
        const platformRow = grid.find('[data-group="platform"]')
        const flowBuildingRow = grid.find('[data-group="flow_building"]')

        expect(checkboxIn(platformRow, 0).find('.checkbox').attributes('checked')).toBe('true')
        expect(checkboxIn(platformRow, 1).find('.checkbox').attributes('checked')).toBe('true')
        expect(checkboxIn(platformRow, 2).find('.checkbox').attributes('checked')).toBe('false')
        for (const column of [0, 1, 2]) {
            expect(checkboxIn(flowBuildingRow, column).find('.checkbox').attributes('checked')).toBe('true')
        }
    })

    test('explains which teams the default permissions apply to', async () => {
        const wrapper = await mountPage()
        await findRadio(wrapper, 'All teams').trigger('click')
        const note = () => wrapper.find('[data-el="default-permissions-note"]').text()
        expect(note()).toBe('These apply to every team without custom permissions, including teams you join later.')

        for (const row of wrapper.findAll('[data-el="mcp-team-row"]')) {
            await row.find('[data-action="customise-team"]').trigger('click')
            await checkboxIn(row.find('[data-el="mcp-tool-permissions"] [data-group="platform"]'), 2).find('input').setValue(true)
        }
        expect(note()).toBe('Every team you belong to has custom permissions, so these only apply to teams you join later.')
    })

    test('keeps Allow disabled until a team scope is chosen', async () => {
        const wrapper = await mountPage()
        expect(allowButton(wrapper).attributes('disabled')).toBeDefined()

        await findRadio(wrapper, 'All teams').trigger('click')
        expect(allowButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    test('keeps Allow disabled for an expiry in the past or more than a year away', async () => {
        const wrapper = await mountPage()
        await findRadio(wrapper, 'All teams').trigger('click')

        await setExpiry(wrapper, '2020-01-01')
        expect(allowButton(wrapper).attributes('disabled')).toBeDefined()

        await setExpiry(wrapper, futureDate(400))
        expect(allowButton(wrapper).attributes('disabled')).toBeDefined()

        await setExpiry(wrapper, futureDate(30))
        expect(allowButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    test('keeps Allow disabled for specific teams until a team is selected', async () => {
        const wrapper = await mountPage()

        await findRadio(wrapper, 'Specific teams').trigger('click')
        await setExpiry(wrapper, futureDate(30))
        expect(allowButton(wrapper).attributes('disabled')).toBeDefined()

        const teamCheckbox = wrapper.findAll('.ff-checkbox').find(c => c.text().includes('Team One'))
        await teamCheckbox.find('label').trigger('click')
        expect(allowButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    test('sends the default permissions and an empty team override map to /consent', async () => {
        const wrapper = await mountPage()
        await findRadio(wrapper, 'All teams').trigger('click')
        await setExpiry(wrapper, futureDate(30))

        await wrapper.find('[data-action="allow-access"]').trigger('click')
        await flushPromises()

        expect(mockPut).toHaveBeenCalledTimes(1)
        const [url, body] = mockPut.mock.calls[0]
        expect(url).toBe('/account/authorize/request-id/consent')
        expect(body.teamIds).toEqual([])
        expect(body.toolPermissions.default).toEqual({
            platform: { read: true, write: true, destructive: false },
            flow_building: { read: true, write: true, destructive: true }
        })
        expect(body.toolPermissions.teams).toEqual({})
    })

    test('customising a team sends its override, and resetting drops it again', async () => {
        const wrapper = await mountPage()
        await findRadio(wrapper, 'All teams').trigger('click')
        await setExpiry(wrapper, futureDate(30))

        const row = wrapper.findAll('[data-el="mcp-team-row"]').find(r => r.text().includes('Team One'))
        expect(row.text()).toContain('Default')

        await row.find('[data-action="customise-team"]').trigger('click')
        const teamGrid = row.findAll('[data-el="mcp-tool-permissions"]')[0]
        const platformDestructive = checkboxIn(teamGrid.find('[data-group="platform"]'), 2)
        await platformDestructive.find('input').setValue(true)

        expect(row.text()).toContain('Custom')

        await wrapper.find('[data-action="allow-access"]').trigger('click')
        await flushPromises()
        const [, bodyWithOverride] = mockPut.mock.calls.at(-1)
        expect(bodyWithOverride.toolPermissions.teams['team-1'].platform).toEqual({ read: true, write: true, destructive: true })

        await row.find('[data-action="reset-team-default"]').trigger('click')
        expect(row.text()).toContain('Default')
    })

    test('keeps a customised team open until closed, including after a reset', async () => {
        const wrapper = await mountPage()
        await findRadio(wrapper, 'All teams').trigger('click')

        const row = wrapper.findAll('[data-el="mcp-team-row"]').find(r => r.text().includes('Team One'))
        await row.find('[data-action="customise-team"]').trigger('click')
        await checkboxIn(row.find('[data-el="mcp-tool-permissions"] [data-group="platform"]'), 2).find('input').setValue(true)

        expect(row.find('[data-el="mcp-tool-permissions"]').exists()).toBe(true)
        expect(row.find('[data-action="customise-team"]').text()).toBe('Close')

        await row.find('[data-action="customise-team"]').trigger('click')
        expect(row.find('[data-el="mcp-tool-permissions"]').exists()).toBe(false)
        expect(row.find('[data-el="team-permissions-state"]').text()).toBe('Custom')

        await row.find('[data-action="customise-team"]').trigger('click')
        await row.find('[data-action="reset-team-default"]').trigger('click')
        expect(row.find('[data-el="team-permissions-state"]').text()).toBe('Default')
        expect(row.find('[data-el="mcp-tool-permissions"]').exists()).toBe(true)
    })

    test('drops team customisations when the team scope changes', async () => {
        const wrapper = await mountPage()
        await findRadio(wrapper, 'All teams').trigger('click')

        const row = wrapper.findAll('[data-el="mcp-team-row"]').find(r => r.text().includes('Team One'))
        await row.find('[data-action="customise-team"]').trigger('click')
        await checkboxIn(row.find('[data-el="mcp-tool-permissions"] [data-group="platform"]'), 2).find('input').setValue(true)

        await findRadio(wrapper, 'Specific teams').trigger('click')
        expect(row.find('[data-el="mcp-tool-permissions"]').exists()).toBe(false)

        await row.find('.ff-checkbox label').trigger('click')
        expect(row.find('[data-el="team-permissions-state"]').text()).toBe('Default')
    })

    test('disables the defaults when every selected team is customised', async () => {
        const wrapper = await mountPage()
        await findRadio(wrapper, 'Specific teams').trigger('click')

        const row = wrapper.findAll('[data-el="mcp-team-row"]').find(r => r.text().includes('Team One'))
        await row.find('.ff-checkbox label').trigger('click')
        expect(defaultGridCheckboxes(wrapper).find('.ff-checkbox').attributes('disabled')).toBe('false')
        expect(wrapper.find('[data-el="default-permissions-note"]').text()).toBe('These apply to the selected teams without custom permissions.')

        await row.find('[data-action="customise-team"]').trigger('click')
        await checkboxIn(row.find('[data-el="mcp-tool-permissions"] [data-group="platform"]'), 2).find('input').setValue(true)
        expect(defaultGridCheckboxes(wrapper).find('.ff-checkbox').attributes('disabled')).toBe('true')
        expect(wrapper.find('[data-el="default-permissions-note"]').text()).toBe('Not used, every selected team has custom permissions.')
    })
})
