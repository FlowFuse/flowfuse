import client from './client'

import type { DataSchema, DataSchemaDraft, DataSchemaVersion } from '@/types'

const schemaUrl = (teamId: string, schemaId: string) => `/api/v1/teams/${teamId}/schemas/${schemaId}`

const createSchema = async (teamId: string, body: { name: string }): Promise<DataSchema> => {
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

const createDraft = async (teamId: string, schemaId: string, body: { from?: string }): Promise<DataSchemaDraft> => {
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
    createSchema,
    getSchema,
    getVersion,
    getDraft,
    createDraft,
    updateDraft,
    deleteDraft,
    publishDraft
}
