import client from './client.js'

const getDataBases = (teamId) => {
    return client.get(`/api/v1/teams/${teamId}/databases`)
        .then(res => res.data)
}

const getTables = (teamId, databaseId) => {
    return client.get(`/api/v1/teams/${teamId}/databases/${databaseId}/tables`)
        .then(res => res.data.tables)
}

const createDatabase = (teamId, name) => {
    return client.post(`/api/v1/teams/${teamId}/databases`, { name })
        .then(res => res.data)
}

const getTableSchema = (teamId, databaseId, tableName, schemaName) => {
    const suffix = schemaName ? `/${schemaName}` : ''
    return client.get(`/api/v1/teams/${teamId}/databases/${databaseId}/tables/${tableName}${suffix}`)
        .then(res => res.data)
}

const getTableData = (teamId, databaseId, tableName, schemaName, { page, limit } = {}) => {
    const suffix = schemaName ? `/${schemaName}` : ''
    return client.get(`/api/v1/teams/${teamId}/databases/${databaseId}/tables/${tableName}/data${suffix}`, { params: { page, limit } })
        .then(res => res.data)
}

const createTable = (teamId, databaseId, payload) => {
    return client.post(`/api/v1/teams/${teamId}/databases/${databaseId}/tables`, payload)
        .then(res => res.data)
}

const deleteTable = (teamId, databaseId, tableName, schemaName) => {
    const suffix = schemaName ? `/${schemaName}` : ''
    return client.delete(`/api/v1/teams/${teamId}/databases/${databaseId}/tables/${tableName}${suffix}`)
        .then(res => res.data)
}

export default {
    createDatabase,
    getDataBases,
    getTables,
    getTableSchema,
    getTableData,
    createTable,
    deleteTable
}
