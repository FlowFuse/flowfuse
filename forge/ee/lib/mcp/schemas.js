const { z } = require('zod')

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

module.exports = { basePagination, searchQuery, sortParams, auditLogFilters, paginationParams, auditLogQuery }
