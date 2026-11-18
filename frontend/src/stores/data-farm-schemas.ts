// @TODO-SCHEMAS: REPLACE THESE TYPES WITH DataSchemaSummary, DataSchemaDraft AND DataSchemaVersion FROM '@/types' ONCE generated.ts IS REGENERATED WITH THE SCHEMA ROUTES (#9245-#9248)
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SchemaSummary {
    id: string
    name: string
    group: { id: string, name: string } | null
}

export interface SchemaDraft {
    schema: Record<string, unknown>
    notes: string | null
}

export interface SchemaVersion {
    version: string
    status: 'draft' | 'published' | 'deprecated'
    notes: string | null
    publishedAt: string
    publishedBy: { name: string } | null
}

export const useDataFarmSchemasStore = defineStore('data-farm-schemas', () => {
    const activeSchema = ref<SchemaSummary | null>(null)
    const activeDraft = ref<SchemaDraft | null>(null)
    const activeLatestPublished = ref<SchemaVersion | null>(null)
    const schemaHydrated = ref(false)

    async function loadActiveSchema (schemaId: string): Promise<void> {
        schemaHydrated.value = false
        // @TODO-SCHEMAS: GET /api/v1/teams/:teamId/schemas/:schemaId (#9226) INTO activeSchema AND activeLatestPublished, AND GET /api/v1/teams/:teamId/schemas/:schemaId/draft (#9227) INTO activeDraft (404 MEANS NO DRAFT)
        activeSchema.value = { id: schemaId, name: schemaId, group: null }
        activeDraft.value = { schema: { type: 'object', properties: {} }, notes: null }
        activeLatestPublished.value = null
        schemaHydrated.value = true
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async function saveDraft (changes: { schema?: Record<string, unknown>, notes?: string }): Promise<void> {
        // @TODO-SCHEMAS: PUT /api/v1/teams/:teamId/schemas/:schemaId/draft WITH changes (#9227), THEN SET activeDraft FROM THE RESPONSE
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async function createDraft (from?: string): Promise<void> {
        // @TODO-SCHEMAS: POST /api/v1/teams/:teamId/schemas/:schemaId/draft WITH { from } (#9227), THEN SET activeDraft FROM THE RESPONSE
    }

    async function discardDraft (): Promise<void> {
        // @TODO-SCHEMAS: DELETE /api/v1/teams/:teamId/schemas/:schemaId/draft (#9227), THEN SET activeDraft TO null
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async function publishDraft (payload: { version: string, notes: string }): Promise<void> {
        // @TODO-SCHEMAS: POST /api/v1/teams/:teamId/schemas/:schemaId/draft/publish WITH payload (#9227), THEN SET activeLatestPublished FROM THE RESPONSE AND activeDraft TO null; THROW invalid_version, version_exists, version_not_higher AND schema_has_problems FOR THE DIALOG
    }

    function reset (): void {
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
        loadActiveSchema,
        saveDraft,
        createDraft,
        discardDraft,
        publishDraft,
        reset
    }
})
