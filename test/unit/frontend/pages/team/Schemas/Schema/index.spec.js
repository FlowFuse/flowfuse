import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Roles } from '../../../../../../../forge/lib/roles.js'
import TeamSchema from '../../../../../../../frontend/src/pages/team/Schemas/Schema/index.vue'
import Alerts from '../../../../../../../frontend/src/services/alerts.js'
import { useAccountSettingsStore } from '../../../../../../../frontend/src/stores/account-settings.js'
import { useContextStore } from '../../../../../../../frontend/src/stores/context.js'
import { useDataFarmSchemasStore } from '../../../../../../../frontend/src/stores/data-farm-schemas.ts'
import { useUxDialogStore } from '../../../../../../../frontend/src/stores/ux-dialog.js'

const router = vi.hoisted(() => ({ push: vi.fn() }))
const Dialog = vi.hoisted(() => ({ show: vi.fn(), showAsync: vi.fn(), close: vi.fn() }))

vi.mock('../../../../../../../frontend/src/services/dialog.js', () => ({
    default: Dialog
}))

vi.mock('vue-router', () => ({
    useRoute: () => ({ params: { team_slug: 'team', schemaId: 'abc' } }),
    useRouter: () => router
}))

vi.mock('../../../../../../../frontend/src/services/alerts.js', () => ({
    default: { emit: vi.fn() }
}))

const DRAFT = { status: 'draft', schema: { type: 'object' }, notes: '', problems: [] }
const PUBLISHED = { version: '1.2.0', status: 'published', schema: { type: 'object' }, notes: '', publishedAt: '2026-11-01T00:00:00Z', publishedBy: null }
const apiError = (error) => Object.assign(new Error(error), { response: { data: { error } } })

function mountPage (role, { draft = null, latestPublished = null, loadError = null } = {}) {
    const pinia = createTestingPinia({ createSpy: vi.fn })
    useAccountSettingsStore(pinia).featuresCheck = { isJsonSchemasFeatureEnabled: true }
    const context = useContextStore(pinia)
    context.team = { slug: 'team' }
    context.teamMembership = { role }
    const schemas = useDataFarmSchemasStore(pinia)
    schemas.activeSchema = { id: 'abc', name: 'Temperature', group: null }
    schemas.activeDraft = draft
    schemas.activeLatestPublished = latestPublished
    if (loadError) schemas.loadActiveSchema.mockRejectedValue(loadError)
    const page = mount(TeamSchema, {
        global: {
            plugins: [pinia],
            stubs: {
                'ff-page': { template: '<div><slot name="header" /><slot /></div>' },
                'ff-page-header': { template: '<div><slot name="status" /><slot name="context" /><slot name="tools" /></div>' },
                'ff-button': { template: '<button><slot /></button>' },
                'router-view': true,
                StatusBadge: { props: ['text'], template: '<span data-el="schema-status">{{ text }}</span>' }
            }
        }
    })
    return { page, schemas, dialogStore: useUxDialogStore(pinia) }
}

// opens the publish dialog, types a version and returns what the confirm button runs
async function openPublishDialog (page) {
    await page.find('[data-action="publish"]').trigger('click')
    const [options, onConfirm] = Dialog.show.mock.calls.at(-1)
    options.is.on.change({ version: '1.3.0', notes: '' })
    return { options, onConfirm }
}

describe('Team Schema page', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('shows the draft badge and draft actions to a Member', () => {
        const { page } = mountPage(Roles.Member, { draft: DRAFT })
        expect(page.find('[data-el="schema-status"]').text()).toBe('Draft')
        expect(page.find('[data-action="discard-draft"]').exists()).toBe(true)
        expect(page.find('[data-action="save-draft"]').exists()).toBe(true)
        expect(page.find('[data-action="publish"]').exists()).toBe(true)
    })

    test('hides draft actions from a Viewer', () => {
        const { page } = mountPage(Roles.Viewer, { draft: DRAFT })
        expect(page.find('[data-action="discard-draft"]').exists()).toBe(false)
        expect(page.find('[data-action="save-draft"]').exists()).toBe(false)
        expect(page.find('[data-action="publish"]').exists()).toBe(false)
        expect(page.find('[data-action="create-draft"]').exists()).toBe(false)
    })

    test('shows the latest published version read-only with a create draft action', () => {
        const { page } = mountPage(Roles.Member, { latestPublished: PUBLISHED })
        expect(page.find('[data-el="schema-status"]').text()).toBe('Published 1.2.0')
        expect(page.find('[data-action="publish"]').exists()).toBe(false)
        expect(page.find('[data-action="create-draft"]').text()).toBe('Create draft from 1.2.0')
    })

    test('shows a deprecated latest version', () => {
        const { page } = mountPage(Roles.Member, { latestPublished: { ...PUBLISHED, status: 'deprecated' } })
        expect(page.find('[data-el="schema-status"]').text()).toBe('Deprecated 1.2.0')
    })

    test('goes back to the schema list when the schema fails to load', async () => {
        mountPage(Roles.Member, { loadError: apiError('Not Found') })
        await flushPromises()
        expect(Alerts.emit).toHaveBeenCalledWith('Not Found', 'warning')
        expect(router.push).toHaveBeenCalledWith({ name: 'team-schemas', params: { team_slug: 'team' } })
    })

    test('opens the publish dialog with the versions it checks against, and keeps it open on confirm', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: { ...DRAFT, notes: 'draft notes' }, latestPublished: PUBLISHED })
        schemas.existingVersions = ['1.2.0']
        const { options } = await openPublishDialog(page)
        expect(options.header).toBe('Publish Temperature')
        expect(options.closeOnConfirm).toBe(false)
        expect(options.is.payload).toMatchObject({ latestVersion: '1.2.0', existingVersions: ['1.2.0'], draftNotes: 'draft notes' })
    })

    test('publishes what was typed and closes the dialog', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.publishDraft.mockResolvedValue()
        const { onConfirm } = await openPublishDialog(page)
        await onConfirm()
        expect(schemas.publishDraft).toHaveBeenCalledWith({ version: '1.3.0', notes: '' })
        expect(Dialog.close).toHaveBeenCalled()
        expect(Alerts.emit).toHaveBeenCalledWith('Version 1.3.0 published.', 'confirmation')
    })

    test('shows a publish error in the dialog while the draft still exists', async () => {
        const { page, schemas, dialogStore } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.publishDraft.mockRejectedValue(apiError('Version 1.3.0 already exists'))
        const { onConfirm } = await openPublishDialog(page)
        await onConfirm()
        expect(dialogStore.updateDialogPayload).toHaveBeenCalledWith(expect.objectContaining({ error: 'Version 1.3.0 already exists' }))
        expect(Dialog.close).not.toHaveBeenCalled()
    })

    test('ignores a second publish while one is running', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.publishDraft.mockReturnValue(new Promise(() => {}))
        const { onConfirm } = await openPublishDialog(page)
        onConfirm()
        onConfirm()
        await flushPromises()
        expect(schemas.publishDraft).toHaveBeenCalledTimes(1)
    })

    test('closes the dialog when the draft was published or discarded elsewhere', async () => {
        const { page, schemas, dialogStore } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.publishDraft.mockImplementation(async () => {
            schemas.activeDraft = null
            throw apiError('The draft was published or discarded by another request')
        })
        const { onConfirm } = await openPublishDialog(page)
        await onConfirm()
        expect(Dialog.close).toHaveBeenCalled()
        expect(Alerts.emit).toHaveBeenCalledWith('The draft was published or discarded by another request', 'warning')
        expect(dialogStore.updateDialogPayload).not.toHaveBeenCalledWith(expect.objectContaining({ error: 'The draft was published or discarded by another request' }))
    })

    test('keeps unsaved notes when the same draft is reloaded', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: { ...DRAFT, notes: 'saved' } })
        page.vm.notes = 'typed, not saved'
        schemas.activeDraft = { ...DRAFT, notes: 'saved' }
        await flushPromises()
        expect(page.vm.notes).toBe('typed, not saved')
    })

    test('follows the draft when its saved notes change, and clears the notes when it goes away', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: { ...DRAFT, notes: 'saved' } })
        page.vm.notes = 'typed, not saved'
        schemas.activeDraft = { ...DRAFT, notes: 'saved by someone else' }
        await flushPromises()
        expect(page.vm.notes).toBe('saved by someone else')
        page.vm.notes = 'typed again'
        schemas.activeDraft = null
        await flushPromises()
        expect(page.vm.notes).toBe('')
    })

    test('goes back to the schema list when an action finds the schema gone', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.saveDraft.mockImplementation(async () => {
            schemas.activeSchema = null
            throw apiError('Not Found')
        })
        await page.find('[data-action="save-draft"]').trigger('click')
        await flushPromises()
        expect(Alerts.emit).toHaveBeenCalledWith('Not Found', 'warning')
        expect(router.push).toHaveBeenCalledWith({ name: 'team-schemas', params: { team_slug: 'team' } })
    })

    test('stays on the page when an action fails but the schema is still there', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.saveDraft.mockRejectedValue(apiError('The draft was published or discarded by another request'))
        await page.find('[data-action="save-draft"]').trigger('click')
        await flushPromises()
        expect(Alerts.emit).toHaveBeenCalledWith('The draft was published or discarded by another request', 'warning')
        expect(router.push).not.toHaveBeenCalled()
    })
})
