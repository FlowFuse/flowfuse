import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import schemasApi from '@/api/schemas'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'

vi.mock('@/api/schemas', () => ({
    default: {
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
        await store.createDraft('1.1.0')
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
        await store.createDraft('1.1.0')
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
        expect(await store.createSchema('Temp')).toEqual({ id: 'new' })
        expect(schemasApi.createSchema).toHaveBeenCalledWith('team-1', { name: 'Temp' })
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
})
