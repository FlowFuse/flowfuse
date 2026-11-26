import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import schemasApi from '@/api/schemas'
import Alerts from '@/services/alerts.js'
import { useContextStore } from '@/stores/context.js'
import type { DataSchema, DataSchemaDraft, DataSchemaGroup, DataSchemaSummary, DataSchemaVersion, DataSchemaVersionSummary } from '@/types'

const errorCode = (err: unknown) => (err as { response?: { data?: { code?: string } } })?.response?.data?.code
const draftGone = (err: unknown) => ['draft_changed', 'not_found'].includes(errorCode(err) ?? '')

// The schemas loaded so far for one part of the list, and whether the server has more
export interface SchemaListPage {
    schemas: DataSchemaSummary[]
    count: number
    nextCursor?: string
}

// The section of the list for schemas that are in no group. It is not a group on the server.
export const UNGROUPED = 'none'
const LIST_PAGE_SIZE = 20

export const groupMatches = (group: DataSchemaGroup, query: string) => !!query && group.name.toLowerCase().includes(query.toLowerCase())

export const useDataFarmSchemasStore = defineStore('data-farm-schemas', () => {
    const activeSchema = ref<DataSchema | null>(null)
    const activeDraft = ref<DataSchemaDraft | null>(null)
    const activeLatestPublished = ref<DataSchemaVersion | null>(null)
    const schemaHydrated = ref(false)

    const existingVersions = computed(() => (activeSchema.value?.versions ?? [])
        .flatMap(version => version.status !== 'draft' && version.version ? [version.version] : []))

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
        const latest = schema.versions.find(version => version.status !== 'draft')?.version
        const [latestVersion, draft] = await Promise.all([
            latest ? schemasApi.getVersion(teamId(), schemaId, latest) : null,
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

    // Reloads the open schema after a draft request found things changed under it.
    // If the schema itself is gone, nothing is left open and the page can leave.
    async function refreshActiveSchema (): Promise<void> {
        if (!activeSchema.value) return
        try {
            await fetchActiveSchema(activeSchema.value.id)
        } catch (err) {
            if (errorCode(err) !== 'not_found') throw err
            reset()
        }
    }

    async function loadActiveSchema (schemaId: string): Promise<void> {
        schemaHydrated.value = false
        if (await fetchActiveSchema(schemaId)) schemaHydrated.value = true
    }

    // --- The list page: the team's groups, and the schemas of each group loaded a page at a time

    const groups = ref<DataSchemaGroup[]>([])
    // keyed by group id, plus UNGROUPED
    const groupSchemas = ref<Record<string, SchemaListPage>>({})
    const listHydrated = ref(false)
    // what the list is searched for, empty when it is not
    const listQuery = ref('')

    // Bumped on every list load and on reset, so an answer for an older request is dropped
    let listToken = 0

    const toPage = (page: { meta: { next_cursor?: string }, count: number, schemas: DataSchemaSummary[] }): SchemaListPage =>
        ({ schemas: page.schemas, count: page.count, nextCursor: page.meta.next_cursor })

    // Loads every group with its first schemas in one request. With a query, a group whose own name matches
    // keeps all of its schemas and the other sections only have the schemas that match.
    async function loadList (query = ''): Promise<void> {
        const token = ++listToken
        const { sections } = await schemasApi.listGrouped(teamId(), { query: query || undefined, limit: LIST_PAGE_SIZE })
        if (token !== listToken) return
        groups.value = sections.flatMap(section => section.group ? [section.group] : [])
        groupSchemas.value = Object.fromEntries(sections.map(section => [section.group?.id ?? UNGROUPED, toPage(section)]))
        listQuery.value = query
        listHydrated.value = true
    }

    // More of one section, searched the way the list was: not at all for a group whose own name matches
    async function loadMoreOfGroup (groupId: string): Promise<void> {
        const token = listToken
        const loaded = groupSchemas.value[groupId]
        const group = groups.value.find(group => group.id === groupId)
        const query = (group && groupMatches(group, listQuery.value)) || !listQuery.value ? undefined : listQuery.value
        const next = toPage(await schemasApi.listSchemas(teamId(), { groupId, query, cursor: loaded.nextCursor, limit: LIST_PAGE_SIZE }))
        if (token !== listToken) return
        groupSchemas.value[groupId] = { ...next, schemas: [...loaded.schemas, ...next.schemas] }
    }

    // A change to the groups moves sections, counts and the order around, so the list is loaded again after one.
    // The change itself has worked by then, so a failed reload is only a warning
    const reloadList = () => loadList(listQuery.value).catch(() => Alerts.emit('Failed to reload the schemas.', 'warning'))

    async function createGroup (name: string): Promise<void> {
        await schemasApi.createGroup(teamId(), name)
        await reloadList()
    }

    async function renameGroup (groupId: string, name: string): Promise<void> {
        await schemasApi.renameGroup(teamId(), groupId, name)
        await reloadList()
    }

    async function deleteGroup (groupId: string): Promise<void> {
        await schemasApi.deleteGroup(teamId(), groupId)
        await reloadList()
    }

    // The description and the group are optional, and left out of the request when empty
    async function createSchema ({ name, description, groupId }: { name: string, description?: string, groupId?: string }): Promise<DataSchema> {
        return schemasApi.createSchema(teamId(), { name, ...(description && { description }), ...(groupId && { groupId }) })
    }

    // The groups a schema can be put in, for where the list is not on screen to have them
    async function fetchGroups (): Promise<DataSchemaGroup[]> {
        return (await schemasApi.listGroups(teamId())).groups
    }

    // Renames a schema, edits its description or moves it to another group (an empty `groupId` is no group).
    // Only what differs from `schema` is sent. The open schema and the list are each brought up to date when on screen.
    async function updateSchema (schema: Pick<DataSchemaSummary, 'id' | 'name' | 'description' | 'group'>, values: { name: string, description: string, groupId: string }): Promise<DataSchema> {
        const token = loadToken
        const updated = await schemasApi.updateSchema(teamId(), schema.id, {
            ...(values.name !== schema.name && { name: values.name }),
            ...(values.description !== schema.description && { description: values.description }),
            ...(values.groupId !== (schema.group?.id ?? '') && { groupId: values.groupId || null })
        })
        if (token === loadToken && activeSchema.value?.id === schema.id) activeSchema.value = updated
        if (listHydrated.value) await reloadList()
        return updated
    }

    // The draft actions below answer for the schema that was open when they were called.
    // If another schema was opened or the page was left before they answer (the load token moved on),
    // their answer is not written here, as it would land on the wrong schema.

    async function saveDraft (changes: { schema?: Record<string, unknown>, notes?: string }): Promise<void> {
        const token = loadToken
        try {
            const draft = await schemasApi.updateDraft(teamId(), activeSchema.value!.id, changes)
            if (token === loadToken) activeDraft.value = draft
        } catch (err) {
            if (token === loadToken && draftGone(err)) await refreshActiveSchema()
            throw err
        }
    }

    function setDraftEntry (entry: DataSchemaVersionSummary | null, published?: DataSchemaVersionSummary): void {
        const schema = activeSchema.value!
        const versions = schema.versions.filter(version => version.status !== 'draft')
        activeSchema.value = {
            ...schema,
            hasDraft: !!entry,
            versions: [...(entry ? [entry] : []), ...(published ? [published] : []), ...versions]
        }
    }

    // Resolves to whether this call created the draft. It did not when a draft already exists, which is loaded instead.
    async function createDraft (from?: string, content?: { schema: Record<string, unknown>, notes: string }): Promise<boolean> {
        const token = loadToken
        let draft: DataSchemaDraft
        try {
            draft = await schemasApi.createDraft(teamId(), activeSchema.value!.id, { from, ...content })
        } catch (err) {
            if (errorCode(err) !== 'draft_exists') throw err
            if (token === loadToken) await refreshActiveSchema()
            return false
        }
        if (token === loadToken) {
            activeDraft.value = draft
            setDraftEntry(draft)
        }
        return true
    }

    async function discardDraft (): Promise<void> {
        const token = loadToken
        try {
            await schemasApi.deleteDraft(teamId(), activeSchema.value!.id)
        } catch (err) {
            if (token === loadToken && draftGone(err)) await refreshActiveSchema()
            throw err
        }
        if (token !== loadToken) return
        activeDraft.value = null
        setDraftEntry(null)
    }

    async function publishDraft (payload: { version: string, notes: string }): Promise<void> {
        const token = loadToken
        let published: DataSchemaVersion
        try {
            published = await schemasApi.publishDraft(teamId(), activeSchema.value!.id, payload)
        } catch (err) {
            const changed = draftGone(err) || ['version_exists', 'version_not_higher'].includes(errorCode(err) ?? '')
            if (token === loadToken && changed) await refreshActiveSchema()
            throw err
        }
        if (token !== loadToken) return
        activeLatestPublished.value = published
        activeDraft.value = null
        setDraftEntry(null, published)
    }

    // One published or deprecated version of the open schema, with its document. Not kept here: it is only looked at.
    async function fetchVersion (version: string): Promise<DataSchemaVersion> {
        return schemasApi.getVersion(teamId(), activeSchema.value!.id, version)
    }

    // Deprecates a published version, or takes that back. If it turns out to be in that state already,
    // the schema changed elsewhere and is loaded again.
    async function setVersionDeprecated (version: string, deprecated: boolean): Promise<void> {
        const token = loadToken
        const request = deprecated ? schemasApi.deprecateVersion : schemasApi.undeprecateVersion
        let updated: DataSchemaVersion
        try {
            updated = await request(teamId(), activeSchema.value!.id, version)
        } catch (err) {
            const changed = ['already_deprecated', 'not_deprecated', 'not_found'].includes(errorCode(err) ?? '')
            if (token === loadToken && changed) await refreshActiveSchema()
            throw err
        }
        if (token !== loadToken) return
        const schema = activeSchema.value!
        activeSchema.value = { ...schema, versions: schema.versions.map(entry => entry.version === version ? { ...entry, status: updated.status, updatedAt: updated.updatedAt } : entry) }
        if (activeLatestPublished.value?.version === version) activeLatestPublished.value = updated
    }

    // Kept apart from `reset`: the schema page clears the open schema when it is left, which is often for the list
    function resetList (): void {
        listToken++
        groups.value = []
        groupSchemas.value = {}
        listHydrated.value = false
        listQuery.value = ''
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
        groups,
        groupSchemas,
        listHydrated,
        listQuery,
        loadList,
        loadMoreOfGroup,
        createGroup,
        renameGroup,
        deleteGroup,
        resetList,
        loadActiveSchema,
        createSchema,
        updateSchema,
        fetchGroups,
        saveDraft,
        createDraft,
        discardDraft,
        publishDraft,
        fetchVersion,
        setVersionDeprecated,
        reset
    }
})
