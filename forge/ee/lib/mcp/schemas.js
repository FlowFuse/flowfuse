const { z } = require('zod')

// Hosted instances are Projects (UUID primary key); the other entities use hashids.
const teamId = z.string().describe('The ID or hashid of the team')
const applicationId = z.string().describe('The ID or hashid of the application')
const hostedInstanceId = z.string().uuid().describe('The UUID of the hosted instance')
const remoteInstanceId = z.string().describe('The ID or hashid of the remote instance')
const snapshotId = z.string().describe('The hashid of the snapshot')

// Query fragments composed per tool by spreading only the ones the backing
// route's finder actually honors. Not the same as the route's declared query
// schema: most list routes reuse a generic PaginationParams that advertises
// page/sort/dir/order even when the finder ignores them. Match the finder.

const cursorParam = {
    cursor: z.string().optional().describe('Opaque cursor from a previous page')
}
const limitParam = {
    limit: z.number().int().min(1).max(50).default(10).describe('Maximum number of records to return (1-50, default 10)')
}
const basePagination = { ...cursorParam, ...limitParam }

// Only Device.getAll and Project.byTeam read page and compute an offset.
const pageParam = {
    page: z.number().int().min(1).optional().default(1).describe('1-based page number (offset pagination)')
}

const searchQuery = {
    query: z.string().optional().describe('Free-text search filter')
}

// Only Project.byTeam honors sort; no finder reads the legacy `order` alias.
const sortParams = {
    sort: z.string().optional().describe('Field name to sort by'),
    dir: z.enum(['asc', 'desc']).optional().describe('Sort direction')
}

// scope is route-specific (its enum differs per entity), so each tool declares it inline.
const auditLogFilters = {
    event: z.union([z.string(), z.array(z.string())]).optional().describe('Filter by audit event name, or an array of event names'),
    username: z.string().optional().describe('Filter by the username that triggered the event')
}

const cursorParamKeys = Object.keys(cursorParam)
const limitParamKeys = Object.keys(limitParam)
const basePaginationKeys = Object.keys(basePagination)
const pageParamKeys = Object.keys(pageParam)
const searchQueryKeys = Object.keys(searchQuery)
const sortParamsKeys = Object.keys(sortParams)
const auditLogFilterKeys = Object.keys(auditLogFilters)

// Serialise the given query keys from args onto a url: only defined values,
// URL-encoded, an array value appended once per element.
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
