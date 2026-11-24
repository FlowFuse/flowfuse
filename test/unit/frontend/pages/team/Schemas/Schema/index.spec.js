import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Roles } from '../../../../../../../forge/lib/roles.js'
import TeamSchema from '../../../../../../../frontend/src/pages/team/Schemas/Schema/index.vue'
import Alerts from '../../../../../../../frontend/src/services/alerts.js'
import Dialog from '../../../../../../../frontend/src/services/dialog.js'
import { useAccountSettingsStore } from '../../../../../../../frontend/src/stores/account-settings.js'
import { useContextStore } from '../../../../../../../frontend/src/stores/context.js'
import { useDataFarmSchemasStore } from '../../../../../../../frontend/src/stores/data-farm-schemas.ts'
import { useUxDialogStore } from '../../../../../../../frontend/src/stores/ux-dialog.js'

const router = vi.hoisted(() => ({ push: vi.fn() }))
const edit = vi.hoisted(() => ({ text: '', notes: '' }))
const routeGuard = vi.hoisted(() => ({ leave: null }))

const EditorStub = {
    props: ['schemaText', 'notes', 'editorProblems', 'markers', 'draft', 'latestPublished', 'readOnly'],
    emits: ['update:schemaText', 'update:notes', 'update:editorProblems'],
    template: '<div><button data-test="set-text" @click="$emit(\'update:schemaText\', edit.text)" /><button data-test="set-notes" @click="$emit(\'update:notes\', edit.notes)" /><span data-test="markers">{{ markers.length }}</span></div>',
    data: () => ({ edit })
}

vi.mock('vue-router', () => ({
    useRoute: () => ({ params: { team_slug: 'team', schemaId: 'abc' } }),
    useRouter: () => router,
    onBeforeRouteLeave: (guard) => { routeGuard.leave = guard }
}))

vi.mock('../../../../../../../frontend/src/services/dialog.js', () => ({
    default: { show: vi.fn(), showAsync: vi.fn(), close: vi.fn() }
}))

vi.mock('../../../../../../../frontend/src/services/alerts.js', () => ({
    default: { emit: vi.fn() }
}))

const DRAFT = { status: 'draft', schema: { type: 'object' }, notes: '', problems: [] }
const PUBLISHED = { version: '1.2.0', status: 'published', schema: { type: 'object' }, notes: '', publishedAt: '2026-11-01T00:00:00Z', publishedBy: null }
const apiError = (error, code) => Object.assign(new Error(error), { response: { data: { error, code } } })

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
                'router-view': { setup: (_, { slots }) => () => slots.default({ Component: EditorStub }) },
                StatusBadge: { props: ['text'], template: '<span data-el="schema-status">{{ text }}</span>' }
            }
        }
    })
    return { page, schemas, dialogStore: useUxDialogStore(pinia) }
}

const setText = async (page, text) => {
    edit.text = text
    await page.find('[data-test="set-text"]').trigger('click')
}

// opens the publish dialog, types a version and returns what the confirm button runs
async function openPublishDialog (page, form = { version: '1.3.0', notes: '' }) {
    await page.find('[data-action="publish"]').trigger('click')
    const [options, onConfirm, onCancel] = Dialog.show.mock.calls.at(-1)
    options.is.on.change(form)
    return { options, onConfirm, onCancel }
}

// opens the publish dialog and confirms it
async function publishFrom (page, form) {
    const { onConfirm } = await openPublishDialog(page, form)
    await onConfirm()
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

    test('enables Publish but not Save for an unchanged valid draft', () => {
        const { page } = mountPage(Roles.Member, { draft: DRAFT })
        expect(page.find('[data-action="save-draft"]').attributes('disabled')).toBeDefined()
        expect(page.find('[data-action="publish"]').attributes('disabled')).toBeUndefined()
    })

    test('enables Save once the draft has unsaved edits', async () => {
        const { page } = mountPage(Roles.Member, { draft: DRAFT })
        edit.notes = 'new notes'
        await page.find('[data-test="set-notes"]').trigger('click')
        expect(page.find('[data-action="save-draft"]').attributes('disabled')).toBeUndefined()
    })

    test('disables Save and Publish when the draft uses a reference', async () => {
        const { page } = mountPage(Roles.Member, { draft: DRAFT })
        edit.text = JSON.stringify({ properties: { a: { $ref: '#' } } })
        await page.find('[data-test="set-text"]').trigger('click')
        expect(page.find('[data-action="save-draft"]').attributes('disabled')).toBeDefined()
        expect(page.find('[data-action="publish"]').attributes('disabled')).toBeDefined()
    })

    test('blocks Publish but not Save while the saved draft has problems from the backend', async () => {
        const { page } = mountPage(Roles.Member, { draft: { ...DRAFT, problems: [{ path: '/type', message: 'must be equal to one of the allowed values' }] } })
        edit.notes = 'new notes'
        await page.find('[data-test="set-notes"]').trigger('click')
        expect(page.find('[data-action="save-draft"]').attributes('disabled')).toBeUndefined()
        expect(page.find('[data-action="publish"]').attributes('disabled')).toBeDefined()
    })

    test('ignores a root $id the backend strips when deciding whether to save before publishing', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        edit.text = JSON.stringify({ $id: 'urn:x', ...DRAFT.schema })
        await page.find('[data-test="set-text"]').trigger('click')
        await publishFrom(page)
        expect(schemas.saveDraft).not.toHaveBeenCalled()
        expect(schemas.publishDraft).toHaveBeenCalled()
    })

    test('keeps showing backend problems when only the notes change', async () => {
        const { page } = mountPage(Roles.Member, { draft: { ...DRAFT, problems: [{ path: '/type', message: 'bad type' }] } })
        edit.notes = 'new notes'
        await page.find('[data-test="set-notes"]').trigger('click')
        expect(page.find('[data-test="markers"]').text()).toBe('1')
        expect(page.find('[data-action="publish"]').attributes('disabled')).toBeDefined()
    })

    test('hides backend problems while the document has unsaved edits', async () => {
        const { page } = mountPage(Roles.Member, { draft: { ...DRAFT, problems: [{ path: '/type', message: 'bad type' }] } })
        edit.text = JSON.stringify({ type: 'string' })
        await page.find('[data-test="set-text"]').trigger('click')
        expect(page.find('[data-test="markers"]').text()).toBe('0')
    })

    test('closes the dialog and shows a toast when the saved draft has problems', async () => {
        const { page, schemas, dialogStore } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.publishDraft.mockRejectedValue(Object.assign(new Error('problems'), { response: { data: { code: 'schema_has_problems', error: 'The draft has problems and cannot be published' } } }))
        await publishFrom(page)
        expect(Dialog.close).toHaveBeenCalled()
        expect(Alerts.emit).toHaveBeenCalledWith('The draft has problems and cannot be published', 'warning')
        expect(dialogStore.updateDialogPayload).not.toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/./) }))
    })

    test('disables Save when the draft is not a JSON object', async () => {
        const { page } = mountPage(Roles.Member, { draft: DRAFT })
        edit.text = '[]'
        await page.find('[data-test="set-text"]').trigger('click')
        expect(page.find('[data-action="save-draft"]').attributes('disabled')).toBeDefined()
    })

    test('saves unsaved edits before publishing', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: { ...DRAFT, schema: { type: 'object' } } })
        schemas.activeDraft.schema = { type: 'object', title: 'saved elsewhere' }
        await publishFrom(page, { version: '1.0.0', notes: '' })
        expect(schemas.saveDraft).toHaveBeenCalledWith({ schema: { type: 'object' }, notes: '' })
        expect(schemas.publishDraft).toHaveBeenCalledWith({ version: '1.0.0', notes: '' })
        expect(schemas.saveDraft.mock.invocationCallOrder[0]).toBeLessThan(schemas.publishDraft.mock.invocationCallOrder[0])
    })

    test('publishes without saving when nothing changed', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        await publishFrom(page, { version: '1.0.0', notes: '' })
        expect(schemas.saveDraft).not.toHaveBeenCalled()
        expect(schemas.publishDraft).toHaveBeenCalled()
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

    test('shows a version error in the dialog while the draft still exists', async () => {
        const { page, schemas, dialogStore } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.publishDraft.mockRejectedValue(apiError('Version 1.3.0 already exists', 'version_exists'))
        await publishFrom(page)
        expect(dialogStore.updateDialogPayload).toHaveBeenCalledWith(expect.objectContaining({ error: 'Version 1.3.0 already exists' }))
        expect(Dialog.close).not.toHaveBeenCalled()
    })

    test('closes the dialog and shows a toast when saving before publishing fails', async () => {
        const { page, schemas, dialogStore } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.saveDraft.mockRejectedValue(apiError('Schema document is too large', 'document_too_large'))
        edit.text = JSON.stringify({ type: 'string' })
        await page.find('[data-test="set-text"]').trigger('click')
        await publishFrom(page)
        expect(schemas.publishDraft).not.toHaveBeenCalled()
        expect(Dialog.close).toHaveBeenCalled()
        expect(Alerts.emit).toHaveBeenCalledWith('Schema document is too large', 'warning')
        expect(dialogStore.updateDialogPayload).not.toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/./) }))
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

    test('clears the notes when the draft goes away', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: { ...DRAFT, notes: 'saved' } })
        page.vm.notes = 'typed, not saved'
        schemas.activeDraft = null
        await flushPromises()
        expect(page.vm.notes).toBe('')
    })

    test('goes back to the schema list when an action finds the schema gone', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.saveDraft.mockImplementation(async () => {
            schemas.activeSchema = null
            throw apiError('Not Found', 'not_found')
        })
        await setText(page, '{"type": "string"}')
        await page.find('[data-action="save-draft"]').trigger('click')
        await flushPromises()
        expect(Alerts.emit).toHaveBeenCalledWith('Not Found', 'warning')
        expect(router.push).toHaveBeenCalledWith({ name: 'team-schemas', params: { team_slug: 'team' } })
        expect(Dialog.showAsync).not.toHaveBeenCalled()
    })

    test('stays on the page when an action fails but the schema is still there', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.saveDraft.mockRejectedValue(apiError('Schema document is too large', 'document_too_large'))
        await setText(page, '{"type": "string"}')
        await page.find('[data-action="save-draft"]').trigger('click')
        await flushPromises()
        expect(Alerts.emit).toHaveBeenCalledWith('Schema document is too large', 'warning')
        expect(router.push).not.toHaveBeenCalled()
    })

    test('shows a failed publish as an alert when the dialog was cancelled meanwhile', async () => {
        const { page, schemas, dialogStore } = mountPage(Roles.Member, { draft: DRAFT })
        let fail
        schemas.publishDraft.mockReturnValue(new Promise((resolve, reject) => { fail = reject }))
        const { onConfirm, onCancel } = await openPublishDialog(page)
        const publishing = onConfirm()
        onCancel()
        fail(apiError('The draft has problems and cannot be published'))
        await publishing
        expect(Alerts.emit).toHaveBeenCalledWith('The draft has problems and cannot be published', 'warning')
        expect(dialogStore.updateDialogPayload).not.toHaveBeenCalledWith(expect.objectContaining({ error: 'The draft has problems and cannot be published' }))
        expect(Dialog.close).not.toHaveBeenCalled()
    })

    test('leaves the dialog alone when a publish succeeds after it was cancelled', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        let finish
        schemas.publishDraft.mockReturnValue(new Promise(resolve => { finish = resolve }))
        const { onConfirm, onCancel } = await openPublishDialog(page)
        const publishing = onConfirm()
        onCancel()
        finish()
        await publishing
        expect(Dialog.close).not.toHaveBeenCalled()
        expect(Alerts.emit).toHaveBeenCalledWith('Version 1.3.0 published.', 'confirmation')
    })

    test('keeps the edited text when a save replaces the draft', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        const compact = '{"type": "object", "title": "compact"}'
        schemas.saveDraft.mockImplementation(async ({ schema }) => { schemas.activeDraft = { ...DRAFT, schema } })
        await setText(page, compact)
        await page.find('[data-action="save-draft"]').trigger('click')
        await flushPromises()
        expect(page.findComponent(EditorStub).props('schemaText')).toBe(compact)
    })

    test('ignores key order when checking for unsaved edits', async () => {
        const { page } = mountPage(Roles.Member, { draft: { ...DRAFT, schema: { type: 'object', title: 'a' }, problems: [{ path: '/title', message: 'bad title' }] } })
        await setText(page, JSON.stringify({ title: 'a', type: 'object' }))
        expect(page.find('[data-action="save-draft"]').attributes('disabled')).toBeDefined()
        expect(page.find('[data-test="markers"]').text()).toBe('1')
    })

    test('marks a schema that is not an object and numbers that would change when saved', async () => {
        const { page } = mountPage(Roles.Member, { draft: DRAFT })
        await setText(page, '[]')
        expect(page.find('[data-test="markers"]').text()).toBe('1')
        await setText(page, '{"type": "number", "maximum": 1e400}')
        expect(page.find('[data-test="markers"]').text()).toBe('1')
        expect(page.find('[data-action="save-draft"]').attributes('disabled')).toBeDefined()
    })

    test('offers a new draft with the edits when the draft is gone on save', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT, latestPublished: PUBLISHED })
        schemas.saveDraft.mockRejectedValue(apiError('The draft was published or discarded by another request', 'draft_changed'))
        Dialog.showAsync.mockResolvedValue('confirm')
        await setText(page, '{"type": "string"}')
        await page.find('[data-action="save-draft"]').trigger('click')
        await flushPromises()
        expect(schemas.createDraft).toHaveBeenCalledWith('1.2.0', { schema: { type: 'string' }, notes: '' })
        expect(Alerts.emit).toHaveBeenCalledWith('New draft started with your changes.', 'confirmation')
    })

    test('leaves the schema alone when the new draft offer is declined', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.saveDraft.mockRejectedValue(apiError('This schema has no draft', 'not_found'))
        Dialog.showAsync.mockResolvedValue('cancel')
        await setText(page, '{"type": "string"}')
        await page.find('[data-action="save-draft"]').trigger('click')
        await flushPromises()
        expect(schemas.createDraft).not.toHaveBeenCalled()
    })

    test('offers a new draft when the draft is gone while saving before publish', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT })
        schemas.saveDraft.mockRejectedValue(apiError('This schema has no draft', 'not_found'))
        Dialog.showAsync.mockResolvedValue('cancel')
        await setText(page, '{"type": "string"}')
        await publishFrom(page)
        expect(Dialog.close).toHaveBeenCalled()
        expect(Dialog.showAsync).toHaveBeenCalled()
        expect(schemas.publishDraft).not.toHaveBeenCalled()
    })

    test('asks before leaving with unsaved edits', async () => {
        const { page } = mountPage(Roles.Member, { draft: DRAFT })
        expect(await routeGuard.leave()).toBe(true)
        expect(Dialog.showAsync).not.toHaveBeenCalled()
        await setText(page, '{"type": "string"}')
        Dialog.showAsync.mockResolvedValue('cancel')
        expect(await routeGuard.leave()).toBe(false)
        Dialog.showAsync.mockResolvedValue('confirm')
        expect(await routeGuard.leave()).toBe(true)
    })

    test('forgets the editor\'s problem count when the draft is replaced', async () => {
        const { page, schemas } = mountPage(Roles.Member, { draft: DRAFT, latestPublished: PUBLISHED })
        await page.findComponent(EditorStub).vm.$emit('update:editorProblems', 1)
        await flushPromises()
        expect(page.find('[data-action="publish"]').attributes('disabled')).toBeDefined()
        // discarded and started again while the editor is not on screen to count the new text
        schemas.activeDraft = null
        await flushPromises()
        schemas.activeDraft = { ...DRAFT }
        await flushPromises()
        expect(page.find('[data-action="publish"]').attributes('disabled')).toBeUndefined()
    })
})
