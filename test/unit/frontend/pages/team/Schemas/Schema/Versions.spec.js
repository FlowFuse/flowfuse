import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Roles } from '../../../../../../../forge/lib/roles.js'
import SchemaVersions from '../../../../../../../frontend/src/pages/team/Schemas/Schema/Versions.vue'
import Alerts from '../../../../../../../frontend/src/services/alerts.js'
import Dialog from '../../../../../../../frontend/src/services/dialog.js'
import { useContextStore } from '../../../../../../../frontend/src/stores/context.js'
import { useDataFarmSchemasStore } from '../../../../../../../frontend/src/stores/data-farm-schemas.ts'

const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('vue-router', () => ({ useRouter: () => router }))

vi.mock('../../../../../../../frontend/src/services/dialog.js', () => ({
    default: { showAsync: vi.fn() }
}))

vi.mock('../../../../../../../frontend/src/services/alerts.js', () => ({
    default: { emit: vi.fn() }
}))

const DRAFT = { version: null, status: 'draft', notes: 'wip', createdBy: { name: 'Dana' }, publishedBy: null, createdAt: '2026-11-20T00:00:00Z', publishedAt: null }
const PUBLISHED = { version: '1.2.0', status: 'published', notes: 'adds unit', createdBy: { name: 'Dana' }, publishedBy: { name: 'Alex' }, createdAt: '2026-11-01T00:00:00Z', publishedAt: '2026-11-02T00:00:00Z' }
const DEPRECATED = { version: '1.1.0', status: 'deprecated', notes: '', createdBy: null, publishedBy: null, createdAt: '2026-10-01T00:00:00Z', publishedAt: '2026-10-02T00:00:00Z' }
const apiError = (error) => Object.assign(new Error(error), { response: { data: { error } } })

function mountTab (role, versions = [DRAFT, PUBLISHED, DEPRECATED]) {
    const pinia = createTestingPinia({ createSpy: vi.fn })
    const context = useContextStore(pinia)
    context.team = { slug: 'team' }
    context.teamMembership = { role }
    const schemas = useDataFarmSchemasStore(pinia)
    schemas.activeSchema = { id: 'abc', name: 'Temperature', group: null, versions }
    const tab = mount(SchemaVersions, {
        global: {
            plugins: [pinia],
            stubs: {
                'ff-data-table': { template: '<table><tbody><slot name="rows" /></tbody></table>' },
                'ff-data-table-row': { template: '<tr><slot /></tr>' },
                'ff-data-table-cell': { template: '<td><slot /></td>' },
                'ff-kebab-menu': { template: '<div data-el="kebab-menu"><slot /></div>' },
                'ff-kebab-item': { props: ['label', 'disabled'], template: '<button :data-item="label" :disabled="disabled">{{ label }}</button>' },
                'router-link': { props: ['to'], template: '<a :data-to="to.name"><slot /></a>' },
                StatusBadge: { props: ['text'], template: '<span>{{ text }}</span>' }
            }
        }
    })
    return { tab, schemas }
}

const row = (tab, version) => tab.find(`[data-el="schema-version-${version}"]`)
const cell = (tab, version, name) => row(tab, version).find(`[data-el="version-${name}"]`).text()

describe('Schema versions tab', () => {
    beforeEach(() => vi.clearAllMocks())

    test('lists every version in the order the schema has them, the draft linking to the editor', () => {
        const { tab } = mountTab(Roles.Member)
        expect(tab.findAll('[data-el^="schema-version-"]').map(entry => entry.attributes('data-el'))).toEqual(['schema-version-draft', 'schema-version-1.2.0', 'schema-version-1.1.0'])
        expect(row(tab, 'draft').find('a').attributes('data-to')).toBe('team-schema-editor')
        expect(cell(tab, '1.2.0', 'number')).toBe('1.2.0')
    })

    test('shows the status, the notes, and who published a version and when', () => {
        const { tab } = mountTab(Roles.Member)
        expect(['draft', '1.2.0', '1.1.0'].map(version => cell(tab, version, 'status'))).toEqual(['Draft', 'Published', 'Deprecated'])
        expect(cell(tab, '1.2.0', 'notes')).toBe('adds unit')
        expect(cell(tab, '1.2.0', 'by')).toBe('Alex')
        expect(cell(tab, '1.2.0', 'when')).toMatch(/ago$/)
        expect(cell(tab, '1.1.0', 'by')).toBe('')
    })

    test('shows who started the draft and when, as it has no publisher', () => {
        const { tab } = mountTab(Roles.Member)
        expect(cell(tab, 'draft', 'by')).toBe('Dana')
        expect(cell(tab, 'draft', 'when')).toMatch(/^Created .* ago$/)
    })

    test('says so when the schema has no versions', () => {
        const { tab } = mountTab(Roles.Member, [])
        expect(tab.find('[data-el="schema-no-versions"]').exists()).toBe(true)
    })

    test('offers Deprecate on a published version and Restore on a deprecated one, and no menu on the draft', () => {
        const { tab } = mountTab(Roles.Member)
        expect(row(tab, 'draft').find('[data-el="kebab-menu"]').exists()).toBe(false)
        expect(row(tab, '1.2.0').find('[data-item="Deprecate 1.2.0"]').exists()).toBe(true)
        expect(row(tab, '1.2.0').find('[data-item="Restore 1.2.0"]').exists()).toBe(false)
        expect(row(tab, '1.1.0').find('[data-item="Restore 1.1.0"]').exists()).toBe(true)
        expect(row(tab, '1.1.0').find('[data-item="Deprecate 1.1.0"]').exists()).toBe(false)
    })

    test('gives a viewer no menus', () => {
        const { tab } = mountTab(Roles.Viewer)
        expect(tab.find('[data-el="kebab-menu"]').exists()).toBe(false)
    })

    test('does not start a draft while the schema has one, and says what to do first', () => {
        const { tab } = mountTab(Roles.Member)
        const item = row(tab, '1.2.0').find('[data-item="Create draft from 1.2.0"]')
        expect(item.attributes('disabled')).toBeDefined()
        expect(item.attributes('title')).toBe('Discard the draft first')
    })

    test('starts a draft from the picked version and opens the editor', async () => {
        const { tab, schemas } = mountTab(Roles.Member, [PUBLISHED, DEPRECATED])
        schemas.createDraft.mockResolvedValue(true)
        await row(tab, '1.1.0').find('[data-item="Create draft from 1.1.0"]').trigger('click')
        await flushPromises()
        expect(schemas.createDraft).toHaveBeenCalledWith('1.1.0')
        expect(router.push).toHaveBeenCalledWith({ name: 'team-schema-editor' })
        expect(Alerts.emit).not.toHaveBeenCalled()
    })

    test('says why when a draft could not be started, and stays on the tab', async () => {
        const { tab, schemas } = mountTab(Roles.Member, [PUBLISHED])
        schemas.createDraft.mockRejectedValue(apiError('Nope'))
        await row(tab, '1.2.0').find('[data-item="Create draft from 1.2.0"]').trigger('click')
        await flushPromises()
        expect(Alerts.emit).toHaveBeenCalledWith('Nope', 'warning')
        expect(router.push).not.toHaveBeenCalled()
    })

    test('deprecates a version only once that is confirmed', async () => {
        const { tab, schemas } = mountTab(Roles.Member)
        Dialog.showAsync.mockResolvedValueOnce('cancel')
        await row(tab, '1.2.0').find('[data-item="Deprecate 1.2.0"]').trigger('click')
        await flushPromises()
        expect(schemas.setVersionDeprecated).not.toHaveBeenCalled()
        Dialog.showAsync.mockResolvedValueOnce('confirm')
        await row(tab, '1.2.0').find('[data-item="Deprecate 1.2.0"]').trigger('click')
        await flushPromises()
        expect(schemas.setVersionDeprecated).toHaveBeenCalledWith('1.2.0', true)
        expect(Alerts.emit).toHaveBeenCalledWith('Version 1.2.0 deprecated.', 'confirmation')
    })

    test('restores a deprecated version without asking', async () => {
        const { tab, schemas } = mountTab(Roles.Member)
        await row(tab, '1.1.0').find('[data-item="Restore 1.1.0"]').trigger('click')
        await flushPromises()
        expect(Dialog.showAsync).not.toHaveBeenCalled()
        expect(schemas.setVersionDeprecated).toHaveBeenCalledWith('1.1.0', false)
        expect(Alerts.emit).toHaveBeenCalledWith('Version 1.1.0 restored.', 'confirmation')
    })

    test('says why when a version could not be deprecated or restored', async () => {
        const { tab, schemas } = mountTab(Roles.Member)
        schemas.setVersionDeprecated.mockRejectedValue(apiError('Version 1.1.0 is not deprecated'))
        await row(tab, '1.1.0').find('[data-item="Restore 1.1.0"]').trigger('click')
        await flushPromises()
        expect(Alerts.emit).toHaveBeenCalledWith('Version 1.1.0 is not deprecated', 'warning')
    })
})
