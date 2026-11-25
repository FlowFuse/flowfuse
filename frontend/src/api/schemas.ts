import client from './client'

import type { DataSchema, DataSchemaDraft, DataSchemaGroup, DataSchemaSummary, DataSchemaVersion } from '@/types'

const schemaUrl = (teamId: string, schemaId: string) => `/api/v1/teams/${teamId}/schemas/${schemaId}`

// One change between two versions, at a JSON Pointer path into the schema document
export interface SchemaChange { path: string, type: 'added' | 'changed' | 'deleted', detail: { from?: unknown, to?: unknown } }

// Where a message breaks a schema. `path` points into the message, at a missing field's own path for `required`
export interface ValidationError { path: string, keyword: string, message: string, params: Record<string, unknown> }

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

// Every group of the team, sorted by name. The list page gets its groups from `listGrouped`
const listGroups = async (teamId: string): Promise<{ count: number, groups: DataSchemaGroup[] }> => {
    return client.get(`/api/v1/teams/${teamId}/schemas/groups`).then(res => res.data)
}

const createGroup = async (teamId: string, name: string): Promise<DataSchemaGroup> => {
    return client.post(`/api/v1/teams/${teamId}/schemas/groups`, { name }).then(res => res.data)
}

const renameGroup = async (teamId: string, groupId: string, name: string): Promise<DataSchemaGroup> => {
    return client.put(`/api/v1/teams/${teamId}/schemas/groups/${groupId}`, { name }).then(res => res.data)
}

// The schemas of a deleted group are kept, without a group
const deleteGroup = async (teamId: string, groupId: string): Promise<void> => {
    return client.delete(`/api/v1/teams/${teamId}/schemas/groups/${groupId}`).then(res => res.data)
}

const createSchema = async (teamId: string, body: { name: string, description?: string, groupId?: string }): Promise<DataSchema> => {
    return client.post(`/api/v1/teams/${teamId}/schemas`, body).then(res => res.data)
}

// `groupId: null` takes the schema out of its group
const updateSchema = async (teamId: string, schemaId: string, body: { name?: string, description?: string, groupId?: string | null }): Promise<DataSchema> => {
    return client.put(schemaUrl(teamId, schemaId), body).then(res => res.data)
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

const deprecateVersion = async (teamId: string, schemaId: string, version: string): Promise<DataSchemaVersion> => {
    return client.post(`${schemaUrl(teamId, schemaId)}/versions/${version}/deprecate`).then(res => res.data)
}

const undeprecateVersion = async (teamId: string, schemaId: string, version: string): Promise<DataSchemaVersion> => {
    return client.post(`${schemaUrl(teamId, schemaId)}/versions/${version}/undeprecate`).then(res => res.data)
}

// What was added, changed or deleted from one version to another. `to` can also be `draft`
const diffVersions = async (teamId: string, schemaId: string, from: string, to: string): Promise<{ from: string, to: string, changes: SchemaChange[] }> => {
    return client.get(`${schemaUrl(teamId, schemaId)}/diff`, { params: { from, to } }).then(res => res.data)
}

// Checks a message against a version, or the saved draft when `against` is `draft`. Nothing is stored
const validateMessage = async (teamId: string, schemaId: string, against: string, payload: unknown): Promise<{ valid: boolean, errors: ValidationError[] }> => {
    const url = against === 'draft' ? `${schemaUrl(teamId, schemaId)}/draft/validate` : `${schemaUrl(teamId, schemaId)}/versions/${against}/validate`
    return client.post(url, { payload }).then(res => res.data)
}

export default {
    listSchemas,
    listGrouped,
    listGroups,
    createGroup,
    renameGroup,
    deleteGroup,
    createSchema,
    updateSchema,
    getSchema,
    getVersion,
    getDraft,
    createDraft,
    updateDraft,
    deleteDraft,
    publishDraft,
    deprecateVersion,
    undeprecateVersion,
    diffVersions,
    validateMessage
}
