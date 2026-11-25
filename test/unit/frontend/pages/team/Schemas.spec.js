import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Roles } from '../../../../../forge/lib/roles.js'
import TeamSchemas from '../../../../../frontend/src/pages/team/Schemas/index.vue'
import Alerts from '../../../../../frontend/src/services/alerts.js'
import { useAccountSettingsStore } from '../../../../../frontend/src/stores/account-settings.js'
import { useContextStore } from '../../../../../frontend/src/stores/context.js'
import { useDataFarmSchemasStore } from '../../../../../frontend/src/stores/data-farm-schemas.ts'
import { useUxDialogStore } from '../../../../../frontend/src/stores/ux-dialog.js'

const router = vi.hoisted(() => ({ push: vi.fn() }))
const Dialog = vi.hoisted(() => ({ show: vi.fn(), close: vi.fn() }))

vi.mock('vue-router', () => ({
    useRouter: () => router
}))

vi.mock('../../../../../frontend/src/services/dialog.js', () => ({
    default: Dialog
}))

vi.mock('../../../../../frontend/src/services/alerts.js', () => ({
    default: { emit: vi.fn() }
}))

const SchemasTableStub = { name: 'SchemasTable', props: ['groups', 'groupSchemas', 'query'], emits: ['load-more'], template: '<div data-el="schemas-table" />' }

// `list` is what the store holds once the list has loaded; without it the page is still loading
function mountPage ({ enabled = true, role = Roles.Member, teamId, list } = {}) {
    const pinia = createTestingPinia({ createSpy: vi.fn })
    useAccountSettingsStore(pinia).featuresCheck = { isJsonSchemasFeatureEnabled: enabled }
    const context = useContextStore(pinia)
    context.team = { slug: 'team', id: teamId }
    context.teamMembership = { role }
    const store = useDataFarmSchemasStore(pinia)
    store.loadList.mockResolvedValue()
    store.loadMoreOfGroup.mockResolvedValue()
    if (list) {
        store.groups = list.groups ?? []
        store.groupSchemas = list.groupSchemas ?? {}
        store.listQuery = list.query ?? ''
        store.listHydrated = true
    }
    const page = mount(TeamSchemas, {
        global: {
            plugins: [pinia],
            stubs: {
                'ff-page': { template: '<div data-el="schemas-page"><slot name="header" /><slot /></div>' },
                'ff-page-header': { template: '<div><slot name="tools" /></div>' },
                'ff-button': { template: '<button><slot /></button>' },
                'ff-text-input': { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">' },
                EmptyState: { template: '<div><slot name="header" /><slot name="message" /><slot name="actions" /></div>' },
                SchemasTable: SchemasTableStub
            }
        }
    })
    return { page, schemas: store, dialogStore: useUxDialogStore(pinia) }
}

// opens the create dialog, types a name and returns what the confirm button runs
async function openCreateDialog (page, name, description = '', groupId = '') {
    await page.find('[data-action="create-schema"]').trigger('click')
    const [options, onConfirm, onCancel] = Dialog.show.mock.calls.at(-1)
    options.is.on.change({ name, description, groupId })
    return { options, onConfirm, onCancel }
}

describe('Team Schemas page', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('shows the page when the feature is on', () => {
        expect(mountPage().page.find('[data-el="schemas-page"]').exists()).toBe(true)
    })

    test('shows nothing when the feature is off', () => {
        expect(mountPage({ enabled: false }).page.find('[data-el="schemas-page"]').exists()).toBe(false)
    })

    test('shows Create schema to a Member', () => {
        expect(mountPage().page.find('[data-action="create-schema"]').exists()).toBe(true)
    })

    test('hides Create schema from a Viewer', () => {
        expect(mountPage({ role: Roles.Viewer }).page.find('[data-action="create-schema"]').exists()).toBe(false)
    })

    test('opens the create dialog from the header button, and keeps it open on confirm', async () => {
        const { options } = await openCreateDialog(mountPage().page, 'Temp')
        expect(options.header).toBe('Create schema')
        expect(options.closeOnConfirm).toBe(false)
    })

    test('creates the schema, closes the dialog and opens the schema', async () => {
        const { page, schemas } = mountPage()
        schemas.createSchema.mockResolvedValue({ id: 'abc' })
        const { onConfirm } = await openCreateDialog(page, 'Temp', 'Reading from a sensor', 'g1')
        await onConfirm()
        expect(schemas.createSchema).toHaveBeenCalledWith({ name: 'Temp', description: 'Reading from a sensor', groupId: 'g1' })
        expect(Dialog.close).toHaveBeenCalled()
        expect(router.push).toHaveBeenCalledWith({ name: 'team-schema', params: { team_slug: 'team', schemaId: 'abc' } })
    })

    test('hands a name conflict to the dialog and stays put', async () => {
        const { page, schemas, dialogStore } = mountPage()
        schemas.createSchema.mockRejectedValue({ response: { data: { error: 'The name is already in use in this team' } } })
        const { onConfirm } = await openCreateDialog(page, 'Temp')
        await onConfirm()
        expect(dialogStore.updateDialogPayload).toHaveBeenCalledWith({ error: 'The name is already in use in this team' })
        expect(Dialog.close).not.toHaveBeenCalled()
        expect(router.push).not.toHaveBeenCalled()
    })

    test('ignores a second confirm while the schema is being created', async () => {
        const { page, schemas } = mountPage()
        schemas.createSchema.mockReturnValue(new Promise(() => {}))
        const { onConfirm } = await openCreateDialog(page, 'Temp')
        onConfirm()
        onConfirm()
        await flushPromises()
        expect(schemas.createSchema).toHaveBeenCalledTimes(1)
    })

    test('stays on the list and says the schema was created when the dialog was cancelled meanwhile', async () => {
        const { page, schemas } = mountPage()
        let finish
        schemas.createSchema.mockReturnValue(new Promise(resolve => { finish = resolve }))
        const { onConfirm, onCancel } = await openCreateDialog(page, 'Temp')
        const creating = onConfirm()
        onCancel()
        finish({ id: 'abc', name: 'Temp' })
        await creating
        expect(router.push).not.toHaveBeenCalled()
        expect(Dialog.close).not.toHaveBeenCalled()
        expect(Alerts.emit).toHaveBeenCalledWith('Schema Temp created.', 'confirmation')
    })

    test('shows a failed create as an alert when the dialog was cancelled meanwhile', async () => {
        const { page, schemas, dialogStore } = mountPage()
        let fail
        schemas.createSchema.mockReturnValue(new Promise((resolve, reject) => { fail = reject }))
        const { onConfirm, onCancel } = await openCreateDialog(page, 'Temp')
        const creating = onConfirm()
        onCancel()
        fail({ response: { data: { error: 'The name is already in use in this team' } } })
        await creating
        expect(Alerts.emit).toHaveBeenCalledWith('The name is already in use in this team', 'warning')
        expect(dialogStore.updateDialogPayload).not.toHaveBeenCalledWith({ error: 'The name is already in use in this team' })
    })

    describe('the list', () => {
        const page20 = (count) => ({ schemas: [], count })
        const LIST = { groups: [{ id: 'g1', name: 'Energy' }, { id: 'g2', name: 'Line' }], groupSchemas: { g1: page20(3), g2: page20(0), none: page20(1) } }

        test('loads the list once the team is known', () => {
            expect(mountPage({ teamId: 'team-1' }).schemas.loadList).toHaveBeenCalledTimes(1)
            expect(mountPage().schemas.loadList).not.toHaveBeenCalled()
        })

        test('does not load anything when the feature is off', () => {
            expect(mountPage({ teamId: 'team-1', enabled: false }).schemas.loadList).not.toHaveBeenCalled()
        })

        test('shows nothing but the header while the list is loading', () => {
            const { page } = mountPage({ teamId: 'team-1' })
            expect(page.find('[data-el="schemas-table"]').exists()).toBe(false)
            expect(page.find('[data-el="schemas-empty"]').exists()).toBe(false)
        })

        test('counts the schemas of every section, and the groups', () => {
            const { page } = mountPage({ teamId: 'team-1', list: LIST })
            expect(page.find('[data-el="schemas-summary"]').text()).toBe('4 schemas in 2 groups')
            expect(page.find('[data-el="schemas-table"]').exists()).toBe(true)
        })

        test('shows an empty state with Create schema when the team has no schemas and no groups', async () => {
            const { page } = mountPage({ teamId: 'team-1', list: { groups: [], groupSchemas: { none: page20(0) } } })
            expect(page.find('[data-el="schemas-empty"]').exists()).toBe(true)
            expect(page.find('[data-el="schemas-table"]').exists()).toBe(false)
            await page.find('[data-action="create-first-schema"]').trigger('click')
            expect(Dialog.show).toHaveBeenCalled()
        })

        test('keeps the empty state free of Create schema for a Viewer', () => {
            const { page } = mountPage({ teamId: 'team-1', role: Roles.Viewer, list: { groups: [], groupSchemas: { none: page20(0) } } })
            expect(page.find('[data-el="schemas-empty"]').exists()).toBe(true)
            expect(page.find('[data-action="create-first-schema"]').exists()).toBe(false)
        })

        test('shows the list, not the empty state, for a team with only empty groups', () => {
            const { page } = mountPage({ teamId: 'team-1', list: { groups: [{ id: 'g1', name: 'Energy' }], groupSchemas: { g1: page20(0), none: page20(0) } } })
            expect(page.find('[data-el="schemas-table"]').exists()).toBe(true)
            expect(page.find('[data-el="schemas-summary"]').text()).toBe('0 schemas in 1 group')
        })

        test('loads the list again for a search a moment after typing stops, with the text trimmed', async () => {
            vi.useFakeTimers()
            const { page, schemas } = mountPage({ teamId: 'team-1', list: LIST })
            await page.find('input').setValue(' te')
            await page.find('input').setValue(' temp ')
            expect(schemas.loadList).toHaveBeenCalledTimes(1)
            vi.advanceTimersByTime(300)
            expect(schemas.loadList).toHaveBeenCalledTimes(2)
            expect(schemas.loadList).toHaveBeenLastCalledWith('temp')
            vi.useRealTimers()
        })

        test('counts the results while a search is on, and hands the search to the table', () => {
            const { page } = mountPage({ teamId: 'team-1', list: { ...LIST, query: 'temp' } })
            expect(page.find('[data-el="schemas-summary"]').text()).toBe('4 results')
            expect(page.findComponent(SchemasTableStub).props('query')).toBe('temp')
        })

        test('keeps the search box, not the empty state, when a search finds nothing in a team with no groups', () => {
            const { page } = mountPage({ teamId: 'team-1', list: { groups: [], groupSchemas: { none: page20(0) }, query: 'temp' } })
            expect(page.find('[data-el="schemas-empty"]').exists()).toBe(false)
            expect(page.find('[data-el="schemas-table"]').exists()).toBe(true)
        })

        test('loads more of a group when the table asks', async () => {
            const { page, schemas } = mountPage({ teamId: 'team-1', list: LIST })
            await page.findComponent(SchemasTableStub).vm.$emit('load-more', 'g1')
            expect(schemas.loadMoreOfGroup).toHaveBeenCalledWith('g1')
        })

        test('says so when the list fails to load', async () => {
            const pinia = createTestingPinia({ createSpy: vi.fn })
            useAccountSettingsStore(pinia).featuresCheck = { isJsonSchemasFeatureEnabled: true }
            const context = useContextStore(pinia)
            context.team = { slug: 'team', id: 'team-1' }
            context.teamMembership = { role: Roles.Member }
            useDataFarmSchemasStore(pinia).loadList.mockRejectedValue({ response: { data: { error: 'Not Found' } } })
            mount(TeamSchemas, { global: { plugins: [pinia], stubs: { 'ff-page': true, 'ff-page-header': true } } })
            await flushPromises()
            expect(Alerts.emit).toHaveBeenCalledWith('Not Found', 'warning')
        })

        test('clears the list when the page is left', () => {
            const { page, schemas } = mountPage({ teamId: 'team-1', list: LIST })
            page.unmount()
            expect(schemas.resetList).toHaveBeenCalled()
        })
    })
})
