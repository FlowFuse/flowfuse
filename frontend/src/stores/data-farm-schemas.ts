import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import schemasApi from '@/api/schemas'
import { useContextStore } from '@/stores/context.js'
import type { DataSchema, DataSchemaDraft, DataSchemaVersion, DataSchemaVersionSummary } from '@/types'

const errorCode = (err: unknown) => (err as { response?: { data?: { code?: string } } })?.response?.data?.code
const draftGone = (err: unknown) => ['draft_changed', 'not_found'].includes(errorCode(err) ?? '')

export const useDataFarmSchemasStore = defineStore('data-farm-schemas', () => {
    const activeSchema = ref<DataSchema | null>(null)
    const activeDraft = ref<DataSchemaDraft | null>(null)
    const activeLatestPublished = ref<DataSchemaVersion | null>(null)
    const schemaHydrated = ref(false)

    const existingVersions = computed(() => (activeSchema.value?.versions ?? [])
        .filter(version => version.status !== 'draft')
        .map(version => version.version as string))

    const teamId = () => useContextStore().team?.id as string

    // Bumped on every load and on reset, so a response for an older load is dropped
    let loadToken = 0

    async function fetchActiveSchema (schemaId: string): Promise<boolean> {
        const token = ++loadToken
        try {
            return await fetchSchemaParts(schemaId, token)
        } catch (err) {
            if (token !== loadToken) return false
            throw err
        }
    }

    async function fetchSchemaParts (schemaId: string, token: number): Promise<boolean> {
        const schema = await schemasApi.getSchema(teamId(), schemaId)
        const latest = schema.versions.find(version => version.status !== 'draft')
        const [latestVersion, draft] = await Promise.all([
            latest ? schemasApi.getVersion(teamId(), schemaId, latest.version as string) : null,
            schema.hasDraft
                ? schemasApi.getDraft(teamId(), schemaId).catch(err => {
                    if (errorCode(err) === 'not_found') return null
                    throw err
                })
                : null
        ])
        if (token !== loadToken) return false
        activeSchema.value = schema
        activeLatestPublished.value = latestVersion
        activeDraft.value = draft
        return true
    }

    async function refreshActiveSchema (): Promise<void> {
        if (activeSchema.value) await fetchActiveSchema(activeSchema.value.id)
    }

    async function loadActiveSchema (schemaId: string): Promise<void> {
        schemaHydrated.value = false
        if (await fetchActiveSchema(schemaId)) schemaHydrated.value = true
    }

    async function createSchema (name: string): Promise<DataSchema> {
        return schemasApi.createSchema(teamId(), { name })
    }

    async function saveDraft (changes: { schema?: Record<string, unknown>, notes?: string }): Promise<void> {
        try {
            activeDraft.value = await schemasApi.updateDraft(teamId(), activeSchema.value!.id, changes)
        } catch (err) {
            if (draftGone(err)) await refreshActiveSchema()
            throw err
        }
    }

    function setDraftEntry (entry: DataSchemaVersionSummary | null, published?: DataSchemaVersionSummary): void {
        const schema = activeSchema.value!
        const versions = schema.versions.filter(version => version.status !== 'draft')
        activeSchema.value = {
            ...schema,
            hasDraft: !!entry,
            versions: [entry, published, ...versions].filter(Boolean) as DataSchemaVersionSummary[]
        }
    }

    async function createDraft (from?: string): Promise<void> {
        try {
            activeDraft.value = await schemasApi.createDraft(teamId(), activeSchema.value!.id, { from })
        } catch (err) {
            if (errorCode(err) !== 'draft_exists') throw err
            return refreshActiveSchema()
        }
        setDraftEntry(activeDraft.value)
    }

    async function discardDraft (): Promise<void> {
        try {
            await schemasApi.deleteDraft(teamId(), activeSchema.value!.id)
        } catch (err) {
            if (draftGone(err)) await refreshActiveSchema()
            throw err
        }
        activeDraft.value = null
        setDraftEntry(null)
    }

    async function publishDraft (payload: { version: string, notes: string }): Promise<void> {
        let published: DataSchemaVersion
        try {
            published = await schemasApi.publishDraft(teamId(), activeSchema.value!.id, payload)
        } catch (err) {
            if (draftGone(err) || ['version_exists', 'version_not_higher'].includes(errorCode(err) ?? '')) await refreshActiveSchema()
            throw err
        }
        activeLatestPublished.value = published
        activeDraft.value = null
        setDraftEntry(null, published)
    }

    function reset (): void {
        loadToken++
        activeSchema.value = null
        activeDraft.value = null
        activeLatestPublished.value = null
        schemaHydrated.value = false
    }

    return {
        activeSchema,
        activeDraft,
        activeLatestPublished,
        schemaHydrated,
        existingVersions,
        loadActiveSchema,
        createSchema,
        saveDraft,
        createDraft,
        discardDraft,
        publishDraft,
        reset
    }
})
