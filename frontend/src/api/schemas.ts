import client from './client'

import type { DataSchema, DataSchemaDraft, DataSchemaGroup, DataSchemaSummary, DataSchemaVersion } from '@/types'

const schemaUrl = (teamId: string, schemaId: string) => `/api/v1/teams/${teamId}/schemas/${schemaId}`

// One page of schemas, as the list endpoints return it
interface SchemaPage { meta: { next_cursor?: string }, count: number, schemas: DataSchemaSummary[] }

// One page of the team's schemas. `groupId` is a group's id, or `none` for schemas without a group
const listSchemas = async (teamId: string, params: { groupId?: string, query?: string, cursor?: string, limit?: number }): Promise<SchemaPage> => {
    return client.get(`/api/v1/teams/${teamId}/schemas`, { params }).then(res => res.data)
}

// The whole list in one request: every group, then the schemas without one (`group` is null), each with its first schemas.
// With a `query`, a group whose name matches keeps all of its schemas and the other sections only have their matches.
const listGrouped = async (teamId: string, params: { query?: string, limit?: number }): Promise<{ count: number, sections: Array<SchemaPage & { group: DataSchemaGroup | null }> }> => {
    return client.get(`/api/v1/teams/${teamId}/schemas/grouped`, { params }).then(res => res.data)
}

const createSchema = async (teamId: string, body: { name: string, description?: string, groupId?: string }): Promise<DataSchema> => {
    return client.post(`/api/v1/teams/${teamId}/schemas`, body).then(res => res.data)
}

const getSchema = async (teamId: string, schemaId: string): Promise<DataSchema> => {
    return client.get(schemaUrl(teamId, schemaId)).then(res => res.data)
}

const getVersion = async (teamId: string, schemaId: string, version: string): Promise<DataSchemaVersion> => {
    return client.get(`${schemaUrl(teamId, schemaId)}/versions/${version}`).then(res => res.data)
}

const getDraft = async (teamId: string, schemaId: string): Promise<DataSchemaDraft> => {
    return client.get(`${schemaUrl(teamId, schemaId)}/draft`).then(res => res.data)
}

const createDraft = async (teamId: string, schemaId: string, body: { from?: string, schema?: Record<string, unknown>, notes?: string }): Promise<DataSchemaDraft> => {
    return client.post(`${schemaUrl(teamId, schemaId)}/draft`, body).then(res => res.data)
}

const updateDraft = async (teamId: string, schemaId: string, body: { schema?: Record<string, unknown>, notes?: string }): Promise<DataSchemaDraft> => {
    return client.put(`${schemaUrl(teamId, schemaId)}/draft`, body).then(res => res.data)
}

const deleteDraft = async (teamId: string, schemaId: string): Promise<void> => {
    return client.delete(`${schemaUrl(teamId, schemaId)}/draft`).then(() => undefined)
}

const publishDraft = async (teamId: string, schemaId: string, body: { version: string, notes?: string }): Promise<DataSchemaVersion> => {
    return client.post(`${schemaUrl(teamId, schemaId)}/draft/publish`, body).then(res => res.data)
}

export default {
    listSchemas,
    listGrouped,
    createSchema,
    getSchema,
    getVersion,
    getDraft,
    createDraft,
    updateDraft,
    deleteDraft,
    publishDraft
}
