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

function mountPage ({ enabled = true, role = Roles.Member } = {}) {
    const pinia = createTestingPinia({ createSpy: vi.fn })
    useAccountSettingsStore(pinia).featuresCheck = { isJsonSchemasFeatureEnabled: enabled }
    const context = useContextStore(pinia)
    context.team = { slug: 'team' }
    context.teamMembership = { role }
    const page = mount(TeamSchemas, {
        global: {
            plugins: [pinia],
            stubs: {
                'ff-page': { template: '<div data-el="schemas-page"><slot name="header" /><slot /></div>' },
                'ff-page-header': { template: '<div><slot name="tools" /></div>' },
                'ff-button': { template: '<button><slot /></button>' }
            }
        }
    })
    return { page, schemas: useDataFarmSchemasStore(pinia), dialogStore: useUxDialogStore(pinia) }
}

// opens the create dialog, types a name and returns what the confirm button runs
async function openCreateDialog (page, name) {
    await page.find('[data-action="create-schema"]').trigger('click')
    const [options, onConfirm, onCancel] = Dialog.show.mock.calls.at(-1)
    options.is.on.change(name)
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
        const { onConfirm } = await openCreateDialog(page, 'Temp')
        await onConfirm()
        expect(schemas.createSchema).toHaveBeenCalledWith('Temp')
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
})
