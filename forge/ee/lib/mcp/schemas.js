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

// Shared query fragments, imported by the tools/*.js files. Compose per tool by
// spreading only the fragments whose params the backing route's finder actually
// HONORS. This is deliberately not the same as the route's declared query schema:
// most list routes reuse one generic PaginationParams schema that advertises
// page/sort/dir/order even when the finder ignores them, so matching the declared
// schema would advertise dead params. Match the finder instead.

// Cursor pagination: every list finder is cursor-based except team projects,
// which is offset/page based (see pageParam). limit defaults to 50 to bound how
// much a single call can return into an agent's context.
const cursorParam = {
    cursor: z.string().optional().describe('Opaque cursor from a previous page')
}
const limitParam = {
    limit: z.number().int().min(1).default(50).describe('Maximum number of records to return (default 50)')
}
const basePagination = { ...cursorParam, ...limitParam }

// Offset pagination: only Device.getAll (remote-instance lists) and
// Project.byTeam (team projects) read page and compute an offset.
const pageParam = {
    page: z.number().int().min(1).optional().describe('1-based page number (offset pagination)')
}

// Free-text search: add for finders that pass search columns to
// buildPaginationSearchClause (matching name/description/username, etc).
const searchQuery = {
    query: z.string().optional().describe('Free-text search filter')
}

// Sorting: only Project.byTeam honors a sort field plus direction. No finder
// reads the legacy `order` alias, so it is not offered.
const sortParams = {
    sort: z.string().optional().describe('Field name to sort by'),
    dir: z.enum(['asc', 'desc']).optional().describe('Sort direction')
}

// Audit-log filters, honored by every audit-log route. event matches a single
// event name or, given an array, any of them. scope is route-specific (its enum
// differs per entity and the device route has none) so each tool declares it inline.
const auditLogFilters = {
    event: z.union([z.string(), z.array(z.string())]).optional().describe('Filter by audit event name, or an array of event names'),
    username: z.string().optional().describe('Filter by the username that triggered the event')
}

// Field-name lists for each fragment, so a tool can serialise exactly the query
// params its route supports without re-listing them.
const cursorParamKeys = Object.keys(cursorParam)
const limitParamKeys = Object.keys(limitParam)
const basePaginationKeys = Object.keys(basePagination)
const pageParamKeys = Object.keys(pageParam)
const searchQueryKeys = Object.keys(searchQuery)
const sortParamsKeys = Object.keys(sortParams)
const auditLogFilterKeys = Object.keys(auditLogFilters)

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
    cursorParam,
    limitParam,
    basePagination,
    pageParam,
    searchQuery,
    sortParams,
    auditLogFilters,
    cursorParamKeys,
    limitParamKeys,
    basePaginationKeys,
    pageParamKeys,
    searchQueryKeys,
    sortParamsKeys,
    auditLogFilterKeys,
    appendQuery
}
