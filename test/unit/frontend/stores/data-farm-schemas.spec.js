import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import schemasApi from '@/api/schemas'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'

vi.mock('@/api/schemas', () => ({
    default: {
        listSchemas: vi.fn(),
        listGroups: vi.fn(),
        createGroup: vi.fn(),
        renameGroup: vi.fn(),
        deleteGroup: vi.fn(),
        createSchema: vi.fn(),
        getSchema: vi.fn(),
        getVersion: vi.fn(),
        getDraft: vi.fn(),
        createDraft: vi.fn(),
        updateDraft: vi.fn(),
        deleteDraft: vi.fn(),
        publishDraft: vi.fn()
    }
}))

vi.mock('@/stores/context.js', () => ({
    useContextStore: () => ({ team: { id: 'team-1' } })
}))

const apiError = (code) => Object.assign(new Error(code), { response: { data: { code, error: code } } })

const schemaWith = (versions, hasDraft) => ({ id: 'abc', name: 'Temperature', group: null, hasDraft, versions })
const DRAFT_SUMMARY = { version: null, status: 'draft' }
const DEPRECATED = { version: '1.2.0', status: 'deprecated' }
const PUBLISHED = { version: '1.1.0', status: 'published' }

describe('data-farm-schemas store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        schemasApi.getVersion.mockImplementation(async (teamId, schemaId, version) => ({ version, schema: {} }))
        schemasApi.getDraft.mockResolvedValue({ status: 'draft', schema: {}, notes: '' })
    })

    it('starts empty', () => {
        const store = useDataFarmSchemasStore()
        expect(store.activeSchema).toBeNull()
        expect(store.activeDraft).toBeNull()
        expect(store.activeLatestPublished).toBeNull()
        expect(store.schemaHydrated).toBe(false)
    })

    it('loads the newest non-draft version, deprecated included, and the draft', async () => {
        schemasApi.getSchema.mockResolvedValue(schemaWith([DRAFT_SUMMARY, DEPRECATED, PUBLISHED], true))
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        expect(schemasApi.getVersion).toHaveBeenCalledWith('team-1', 'abc', '1.2.0')
        expect(store.activeLatestPublished.version).toBe('1.2.0')
        expect(store.activeDraft.status).toBe('draft')
        expect(store.existingVersions).toEqual(['1.2.0', '1.1.0'])
        expect(store.schemaHydrated).toBe(true)
    })

    it('skips the draft request when the schema has no draft', async () => {
        schemasApi.getSchema.mockResolvedValue(schemaWith([PUBLISHED], false))
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        expect(schemasApi.getDraft).not.toHaveBeenCalled()
        expect(store.activeDraft).toBeNull()
    })

    it('treats a draft that disappeared before loading as no draft', async () => {
        schemasApi.getSchema.mockResolvedValue(schemaWith([DRAFT_SUMMARY], true))
        schemasApi.getDraft.mockRejectedValue(apiError('not_found'))
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        expect(store.activeDraft).toBeNull()
        expect(store.activeLatestPublished).toBeNull()
    })

    it('saves the draft and keeps the response', async () => {
        schemasApi.getSchema.mockResolvedValue(schemaWith([DRAFT_SUMMARY], true))
        schemasApi.updateDraft.mockResolvedValue({ status: 'draft', schema: {}, notes: 'saved' })
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        await store.saveDraft({ notes: 'saved' })
        expect(schemasApi.updateDraft).toHaveBeenCalledWith('team-1', 'abc', { notes: 'saved' })
        expect(store.activeDraft.notes).toBe('saved')
    })

    it('reloads and rethrows when the draft changed elsewhere', async () => {
        schemasApi.getSchema.mockResolvedValue(schemaWith([DRAFT_SUMMARY], true))
        schemasApi.updateDraft.mockRejectedValue(apiError('draft_changed'))
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        await expect(store.saveDraft({ notes: 'x' })).rejects.toThrow('draft_changed')
        expect(schemasApi.getSchema).toHaveBeenCalledTimes(2)
    })

    it('loads the existing draft when one was created elsewhere', async () => {
        schemasApi.getSchema.mockResolvedValue(schemaWith([PUBLISHED], false))
        schemasApi.createDraft.mockRejectedValue(apiError('draft_exists'))
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        expect(await store.createDraft('1.1.0')).toBe(false)
        expect(schemasApi.createDraft).toHaveBeenCalledWith('team-1', 'abc', { from: '1.1.0' })
        expect(schemasApi.getSchema).toHaveBeenCalledTimes(2)
    })

    it('creates a draft with the given content', async () => {
        schemasApi.getSchema.mockResolvedValue(schemaWith([PUBLISHED], false))
        schemasApi.createDraft.mockResolvedValue({ version: null, status: 'draft', schema: { type: 'string' }, notes: 'n', problems: [] })
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        await store.createDraft('1.1.0', { schema: { type: 'string' }, notes: 'n' })
        expect(schemasApi.createDraft).toHaveBeenCalledWith('team-1', 'abc', { from: '1.1.0', schema: { type: 'string' }, notes: 'n' })
        expect(store.activeDraft.schema).toEqual({ type: 'string' })
    })

    it('creates a draft from the response without reloading', async () => {
        schemasApi.getSchema.mockResolvedValue(schemaWith([PUBLISHED], false))
        schemasApi.createDraft.mockResolvedValue({ version: null, status: 'draft', schema: {}, notes: '', problems: [] })
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        expect(await store.createDraft('1.1.0')).toBe(true)
        expect(store.activeDraft.status).toBe('draft')
        expect(store.activeSchema.hasDraft).toBe(true)
        expect(store.activeSchema.versions.map(version => version.status)).toEqual(['draft', 'published'])
        expect(schemasApi.getSchema).toHaveBeenCalledTimes(1)
    })

    it('discards the draft without reloading', async () => {
        schemasApi.getSchema.mockResolvedValue(schemaWith([DRAFT_SUMMARY, PUBLISHED], true))
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        await store.discardDraft()
        expect(store.activeDraft).toBeNull()
        expect(store.activeSchema.hasDraft).toBe(false)
        expect(store.existingVersions).toEqual(['1.1.0'])
        expect(schemasApi.getSchema).toHaveBeenCalledTimes(1)
    })

    it('reloads and rethrows when discarding a draft that is already gone', async () => {
        schemasApi.getSchema.mockResolvedValue(schemaWith([DRAFT_SUMMARY], true))
        schemasApi.deleteDraft.mockRejectedValue(apiError('not_found'))
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        await expect(store.discardDraft()).rejects.toThrow('not_found')
        expect(schemasApi.getSchema).toHaveBeenCalledTimes(2)
    })

    it('publishes from the response without reloading', async () => {
        schemasApi.getSchema.mockResolvedValue(schemaWith([DRAFT_SUMMARY, PUBLISHED], true))
        schemasApi.publishDraft.mockResolvedValue({ version: '1.2.0', status: 'published', schema: {}, notes: '' })
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        await store.publishDraft({ version: '1.2.0', notes: '' })
        expect(schemasApi.publishDraft).toHaveBeenCalledWith('team-1', 'abc', { version: '1.2.0', notes: '' })
        expect(store.activeLatestPublished.version).toBe('1.2.0')
        expect(store.activeDraft).toBeNull()
        expect(store.activeSchema.hasDraft).toBe(false)
        expect(store.existingVersions).toEqual(['1.2.0', '1.1.0'])
        expect(schemasApi.getSchema).toHaveBeenCalledTimes(1)
    })

    it('reloads and rethrows when the version was taken by someone else', async () => {
        schemasApi.getSchema.mockResolvedValue(schemaWith([DRAFT_SUMMARY], true))
        schemasApi.publishDraft.mockRejectedValue(apiError('version_not_higher'))
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        await expect(store.publishDraft({ version: '0.1.0', notes: '' })).rejects.toThrow('version_not_higher')
        expect(schemasApi.getSchema).toHaveBeenCalledTimes(2)
    })

    it('rethrows other publish errors without reloading', async () => {
        schemasApi.getSchema.mockResolvedValue(schemaWith([DRAFT_SUMMARY], true))
        schemasApi.publishDraft.mockRejectedValue(apiError('schema_has_problems'))
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        await expect(store.publishDraft({ version: '1.0.0', notes: '' })).rejects.toThrow('schema_has_problems')
        expect(schemasApi.getSchema).toHaveBeenCalledTimes(1)
    })

    it('creates a schema for the active team', async () => {
        schemasApi.createSchema.mockResolvedValue({ id: 'new' })
        const store = useDataFarmSchemasStore()
        expect(await store.createSchema({ name: 'Temp', description: '', groupId: '' })).toEqual({ id: 'new' })
        expect(schemasApi.createSchema).toHaveBeenCalledWith('team-1', { name: 'Temp' })
        await store.createSchema({ name: 'Temp', description: 'Reading from a sensor', groupId: 'g1' })
        expect(schemasApi.createSchema).toHaveBeenLastCalledWith('team-1', { name: 'Temp', description: 'Reading from a sensor', groupId: 'g1' })
    })

    it('drops a slower load for a schema that was left', async () => {
        let finishFirst
        schemasApi.getSchema
            .mockImplementationOnce(() => new Promise(resolve => { finishFirst = () => resolve({ ...schemaWith([PUBLISHED], false), id: 'first' }) }))
            .mockResolvedValueOnce({ ...schemaWith([PUBLISHED], false), id: 'second' })
        const store = useDataFarmSchemasStore()
        const first = store.loadActiveSchema('first')
        await store.loadActiveSchema('second')
        finishFirst()
        await first
        expect(store.activeSchema.id).toBe('second')
        expect(store.schemaHydrated).toBe(true)
    })

    it('ignores a failed load that was already replaced', async () => {
        let failFirst
        schemasApi.getSchema
            .mockImplementationOnce(() => new Promise((resolve, reject) => { failFirst = () => reject(apiError('not_found')) }))
            .mockResolvedValueOnce(schemaWith([PUBLISHED], false))
        const store = useDataFarmSchemasStore()
        const first = store.loadActiveSchema('first')
        await store.loadActiveSchema('abc')
        failFirst()
        await expect(first).resolves.toBeUndefined()
        expect(store.activeSchema.id).toBe('abc')
    })

    it('drops a load that finishes after reset', async () => {
        let finish
        schemasApi.getSchema.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve(schemaWith([PUBLISHED], false)) }))
        const store = useDataFarmSchemasStore()
        const load = store.loadActiveSchema('abc')
        store.reset()
        finish()
        await load
        expect(store.activeSchema).toBeNull()
        expect(store.schemaHydrated).toBe(false)
    })

    it('reset clears the active schema', async () => {
        schemasApi.getSchema.mockResolvedValue(schemaWith([PUBLISHED], false))
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        store.reset()
        expect(store.activeSchema).toBeNull()
        expect(store.activeDraft).toBeNull()
        expect(store.schemaHydrated).toBe(false)
    })

    describe('a draft action that answers after the page moved on', () => {
        const NEW_DRAFT = { version: null, status: 'draft', schema: {}, notes: 'from abc', problems: [] }

        // Opens schema abc, starts the action, opens schema xyz, and only then lets the action answer
        async function answerAfterOpeningAnother (apiCall, answer, start) {
            let finish
            apiCall.mockReturnValue(new Promise((resolve, reject) => { finish = { resolve, reject } }))
            schemasApi.getSchema.mockImplementation(async (teamId, schemaId) => ({ ...schemaWith([PUBLISHED], false), id: schemaId }))
            const store = useDataFarmSchemasStore()
            await store.loadActiveSchema('abc')
            const action = start(store)
            await store.loadActiveSchema('xyz')
            answer(finish)
            return { store, action }
        }

        const expectUntouched = (store) => {
            expect(store.activeSchema.id).toBe('xyz')
            expect(store.activeSchema.hasDraft).toBe(false)
            expect(store.activeDraft).toBeNull()
            expect(store.activeLatestPublished.version).toBe('1.1.0')
        }

        it('does not put a created draft on the schema that is open now', async () => {
            const { store, action } = await answerAfterOpeningAnother(schemasApi.createDraft, finish => finish.resolve(NEW_DRAFT), store => store.createDraft())
            await action
            expectUntouched(store)
        })

        it('does not put a saved draft on the schema that is open now', async () => {
            const { store, action } = await answerAfterOpeningAnother(schemasApi.updateDraft, finish => finish.resolve(NEW_DRAFT), store => store.saveDraft({ notes: 'from abc' }))
            await action
            expectUntouched(store)
        })

        it('does not publish onto the schema that is open now', async () => {
            const { store, action } = await answerAfterOpeningAnother(schemasApi.publishDraft, finish => finish.resolve({ version: '2.0.0', status: 'published' }), store => store.publishDraft({ version: '2.0.0', notes: '' }))
            await action
            expectUntouched(store)
        })

        it('does not reload the schema that is open now when the old one\'s draft was gone', async () => {
            const { store, action } = await answerAfterOpeningAnother(schemasApi.deleteDraft, finish => finish.reject(apiError('not_found')), store => store.discardDraft())
            await expect(action).rejects.toThrow('not_found')
            expectUntouched(store)
            expect(schemasApi.getSchema).toHaveBeenCalledTimes(2)
        })

        it('does nothing once the page was left', async () => {
            let finish
            schemasApi.createDraft.mockReturnValue(new Promise(resolve => { finish = resolve }))
            schemasApi.getSchema.mockResolvedValue(schemaWith([PUBLISHED], false))
            const store = useDataFarmSchemasStore()
            await store.loadActiveSchema('abc')
            const action = store.createDraft()
            store.reset()
            finish(NEW_DRAFT)
            await action
            expect(store.activeSchema).toBeNull()
            expect(store.activeDraft).toBeNull()
        })
    })

    it('leaves nothing open when the schema itself turns out to be gone', async () => {
        schemasApi.getSchema.mockResolvedValueOnce(schemaWith([DRAFT_SUMMARY], true))
        schemasApi.getSchema.mockRejectedValueOnce(apiError('not_found'))
        schemasApi.updateDraft.mockRejectedValue(Object.assign(apiError('not_found'), { message: 'save failed' }))
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        await expect(store.saveDraft({ notes: 'x' })).rejects.toThrow('save failed')
        expect(store.activeSchema).toBeNull()
        expect(store.activeDraft).toBeNull()
        expect(store.schemaHydrated).toBe(false)
    })

    describe('the list', () => {
        const GROUPS = [{ id: 'g1', name: 'Energy', schemaCount: 2 }, { id: 'g2', name: 'Line', schemaCount: 0 }]
        const summary = (id) => ({ id, name: id, description: '', group: null, latestVersion: null, hasDraft: true })
        // answers each list request from what was asked for, so tests can tell the sections apart
        const answerByGroup = (pages) => schemasApi.listSchemas.mockImplementation(async (teamId, { groupId, query, cursor }) => {
            const page = pages[`${groupId}${query ? `?${query}` : ''}${cursor ? `@${cursor}` : ''}`]
            return { meta: { next_cursor: page.next }, count: page.count, schemas: page.ids.map(summary) }
        })

        beforeEach(() => {
            schemasApi.listGroups.mockResolvedValue({ count: GROUPS.length, groups: GROUPS })
        })

        it('loads the groups, then a first page of each group and of the schemas in no group', async () => {
            answerByGroup({ g1: { ids: ['a', 'b'], count: 2 }, g2: { ids: [], count: 0 }, none: { ids: ['c'], count: 1 } })
            const store = useDataFarmSchemasStore()
            await store.loadList()
            expect(schemasApi.listSchemas).toHaveBeenCalledTimes(3)
            expect(schemasApi.listSchemas).toHaveBeenCalledWith('team-1', { groupId: 'none', cursor: undefined, limit: 20 })
            expect(store.groups.map(group => group.name)).toEqual(['Energy', 'Line'])
            expect(store.groupSchemas.g1.schemas.map(schema => schema.id)).toEqual(['a', 'b'])
            expect(store.groupSchemas.g2.count).toBe(0)
            expect(store.groupSchemas.none.schemas.map(schema => schema.id)).toEqual(['c'])
            expect(store.listHydrated).toBe(true)
        })

        it('adds the next page of a group to what is loaded, and stops offering more at the end', async () => {
            answerByGroup({ g1: { ids: ['a', 'b'], count: 3, next: 'b' }, 'g1@b': { ids: ['c'], count: 3 }, g2: { ids: [], count: 0 }, none: { ids: [], count: 0 } })
            const store = useDataFarmSchemasStore()
            await store.loadList()
            expect(store.groupSchemas.g1.nextCursor).toBe('b')
            await store.loadMoreOfGroup('g1')
            expect(store.groupSchemas.g1.schemas.map(schema => schema.id)).toEqual(['a', 'b', 'c'])
            expect(store.groupSchemas.g1.nextCursor).toBeUndefined()
        })

        it('searches each group for a query, and keeps searching when more of a group is loaded', async () => {
            answerByGroup({ 'g1?temp': { ids: ['a'], count: 2, next: 'a' }, 'g1?temp@a': { ids: ['b'], count: 2 }, 'g2?temp': { ids: [], count: 0 }, 'none?temp': { ids: ['c'], count: 1 } })
            const store = useDataFarmSchemasStore()
            await store.loadList('temp')
            expect(store.listQuery).toBe('temp')
            expect(store.groupSchemas.g2.count).toBe(0)
            await store.loadMoreOfGroup('g1')
            expect(store.groupSchemas.g1.schemas.map(schema => schema.id)).toEqual(['a', 'b'])
        })

        it('loads every schema of a group whose own name matches the query', async () => {
            answerByGroup({ g1: { ids: ['a', 'b'], count: 2 }, 'g2?ener': { ids: [], count: 0 }, 'none?ener': { ids: [], count: 0 } })
            const store = useDataFarmSchemasStore()
            await store.loadList('ener')
            expect(store.groupSchemas.g1.schemas.map(schema => schema.id)).toEqual(['a', 'b'])
        })

        it('keeps the list of the latest search when an older one answers last', async () => {
            let answerFirst
            schemasApi.listGroups.mockImplementationOnce(() => new Promise(resolve => { answerFirst = resolve }))
            answerByGroup({ 'g1?te': { ids: ['older'], count: 1 }, 'g2?te': { ids: [], count: 0 }, 'none?te': { ids: [], count: 0 }, 'g1?temp': { ids: ['latest'], count: 1 }, 'g2?temp': { ids: [], count: 0 }, 'none?temp': { ids: [], count: 0 } })
            const store = useDataFarmSchemasStore()
            const first = store.loadList('te')
            await store.loadList('temp')
            answerFirst({ count: GROUPS.length, groups: GROUPS })
            await first
            expect(store.listQuery).toBe('temp')
            expect(store.groupSchemas.g1.schemas.map(schema => schema.id)).toEqual(['latest'])
        })

        it('creates, renames and deletes a group for the active team, loading the list again each time with the search that is on', async () => {
            answerByGroup({ g1: { ids: [], count: 0 }, 'g2?ener': { ids: [], count: 0 }, 'none?ener': { ids: [], count: 0 } })
            const store = useDataFarmSchemasStore()
            await store.loadList('ener')
            await store.createGroup('Quality')
            expect(schemasApi.createGroup).toHaveBeenCalledWith('team-1', 'Quality')
            await store.renameGroup('g1', 'Power')
            expect(schemasApi.renameGroup).toHaveBeenCalledWith('team-1', 'g1', 'Power')
            await store.deleteGroup('g2')
            expect(schemasApi.deleteGroup).toHaveBeenCalledWith('team-1', 'g2')
            expect(schemasApi.listGroups).toHaveBeenCalledTimes(4)
            expect(schemasApi.listSchemas).toHaveBeenLastCalledWith('team-1', expect.objectContaining({ groupId: 'none', query: 'ener' }))
        })

        it('leaves the list alone when a change to a group is refused', async () => {
            schemasApi.createGroup.mockRejectedValue(apiError('name_conflict'))
            const store = useDataFarmSchemasStore()
            await expect(store.createGroup('Energy')).rejects.toBeTruthy()
            expect(schemasApi.listGroups).not.toHaveBeenCalled()
        })

        it('drops a list that answers after the page was left', async () => {
            answerByGroup({ g1: { ids: ['a'], count: 1 }, g2: { ids: [], count: 0 }, none: { ids: [], count: 0 } })
            const store = useDataFarmSchemasStore()
            const loading = store.loadList()
            store.resetList()
            await loading
            expect(store.groups).toEqual([])
            expect(store.listHydrated).toBe(false)
        })

        it('leaves the open schema alone when the list is cleared', async () => {
            schemasApi.getSchema.mockResolvedValue(schemaWith([PUBLISHED], false))
            const store = useDataFarmSchemasStore()
            await store.loadActiveSchema('abc')
            store.resetList()
            expect(store.activeSchema.id).toBe('abc')
        })
    })
})
