const { z } = require('zod')

// Entity-ID params, imported by the tools so every tool names a given resource
// with one canonical field, validator and wording. Hosted instances are Projects
// (UUID primary key); teams, applications, devices and snapshots use hashids. A
// device and a remote instance are the same entity, so both use remoteInstanceId.
// Each tool's own description explains how it uses the id, so these stay generic.
const teamId = z.string().describe('The ID or hashid of the team')
const applicationId = z.string().describe('The ID or hashid of the application')
const hostedInstanceId = z.string().uuid().describe('The UUID of the hosted instance')
const remoteInstanceId = z.string().describe('The ID or hashid of the remote instance')
const snapshotId = z.string().describe('The hashid of the snapshot')

// Shared query fragments, imported by the tools/*.js files. Compose per route:
// spread basePagination, then add searchQuery / sortParams / auditLogFilters only
// when the backing route supports those params, so a tool never advertises a
// filter its route ignores.

// Base pagination: every paginated list tool includes these.
const basePagination = {
    cursor: z.string().optional().describe('Opaque cursor from a previous page'),
    limit: z.number().optional().describe('Maximum number of records to return'),
    page: z.number().int().min(1).optional().describe('1-based page number')
}

// Free-text search: add for routes that support a name/text filter.
const searchQuery = {
    query: z.string().optional().describe('Free-text search filter')
}

// Sorting: add for routes that support sorting.
const sortParams = {
    sort: z.string().optional().describe('Field name to sort by'),
    dir: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order (alias of dir)')
}

// Audit-log filters: add on top of the three above for audit-log tools.
const auditLogFilters = {
    event: z.union([z.string(), z.array(z.string())]).optional().describe('Filter by audit event name, or an array of event names'),
    username: z.string().optional().describe('Filter by the username that triggered the event')
}

// Pre-composed combinations for the frequent cases.
const paginationParams = { ...basePagination, ...searchQuery, ...sortParams }
const auditLogQuery = { ...paginationParams, ...auditLogFilters }

// Field-name lists for each fragment, so a tool can serialise exactly the query
// params its route supports without re-listing them.
const basePaginationKeys = Object.keys(basePagination)
const paginationParamsKeys = Object.keys(paginationParams)
const auditLogQueryKeys = Object.keys(auditLogQuery)

// Serialise the given query fields from args onto a url. The single place every
// read tool builds a query string: only defined values are included, values are
// URL-encoded, and an array value (e.g. multiple audit event names) is appended
// once per element.
function appendQuery (url, args, keys) {
    const params = new URLSearchParams()
    for (const key of keys) {
        const value = args[key]
        if (value === undefined || value === null) {
            continue
        }
        if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v))
        } else {
            params.append(key, value)
        }
    }
    const queryString = params.toString()
    return queryString ? `${url}?${queryString}` : url
}

module.exports = {
    teamId,
    applicationId,
    hostedInstanceId,
    remoteInstanceId,
    snapshotId,
    basePagination,
    searchQuery,
    sortParams,
    auditLogFilters,
    paginationParams,
    auditLogQuery,
    basePaginationKeys,
    paginationParamsKeys,
    auditLogQueryKeys,
    appendQuery
}
