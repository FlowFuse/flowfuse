const { z } = require('zod')

// Hosted instances are Projects (UUID primary key); the other entities use hashids.
const teamId = z.string().describe('The hashid of the team')
const applicationId = z.string().describe('The hashid of the application')
const hostedInstanceId = z.string().uuid().describe('The id (UUID) of the hosted instance')
const remoteInstanceId = z.string().describe('The hashid of the remote instance')
const snapshotId = z.string().describe('The hashid of the snapshot')

// Shared by the pipeline stage add and update tools: both routes take the same
// git-repo fields. forUpdate carries the one real difference between them, that
// the update route applies the git settings as a set and empties anything omitted,
// with credentialSecret as the documented exception.
const gitStageFields = ({ forUpdate = false } = {}) => {
    const resendNote = forUpdate ? '. Resent on every git update; reset to empty when omitted' : ''
    return {
        gitTokenId: z.string().optional().describe(forUpdate
            ? 'Hashid of a team git token. Required on every update of a git-repo stage, together with the full git settings, since the git settings are only applied when it is present and are applied as a set'
            : 'Hashid of a team git token, making this a git-repository stage. Pass exactly one target, and include url'),
        url: z.string().optional().describe(`Git repository URL for a git-repo stage${resendNote}`),
        branch: z.string().optional().describe(`Git branch to push to (git-repo stage)${resendNote}`),
        pullBranch: z.string().optional().describe(`Git branch to pull from (git-repo stage)${resendNote}`),
        pushPath: z.string().optional().describe(`Repository path to push to (git-repo stage)${resendNote}`),
        pullPath: z.string().optional().describe(`Repository path to pull from (git-repo stage)${resendNote}`),
        credentialSecret: z.string().optional().describe(forUpdate
            ? 'Secret used to encrypt flow credentials pushed to the repository. Unlike the other git fields it keeps its stored value when omitted'
            : 'Secret used to encrypt flow credentials pushed to the git repository')
    }
}
const gitStageFieldKeys = Object.keys(gitStageFields())
// Shared by the snapshot export and import tools: both routes take the same
// component selection, and the controller applies the same defaults to each.
// Direction-specific cautions (an export exposing hidden values, for instance)
// belong in the owning tool's description, not here.
const snapshotComponents = z.object({
    flows: z.boolean().optional().describe('Include the flows (default true). Excluding flows also excludes credentials'),
    credentials: z.boolean().optional().describe('Include the encrypted flow credentials (default true)'),
    envVars: z.union([z.enum(['all', 'keys']), z.literal(false)]).optional().describe('Environment variables: "all" keeps keys and values (default), "keys" keeps only the names, false removes them entirely. Note "keys" also drops the hidden flag, so a secret variable comes back as an ordinary empty one')
}).optional().describe('Optional selection of which snapshot components to include')

// Query fragments composed per tool by spreading only the ones the backing
// route's finder actually honors. Not the same as the route's declared query
// schema: most list routes reuse a generic PaginationParams that advertises
// page/sort/dir/order even when the finder ignores them. Match the finder.

const cursorParam = {
    cursor: z.string().optional().describe('Opaque cursor from a previous page')
}
// Order matters: `.default(x).optional()` emits an optional property carrying a
// default, which is what we want. The reverse, `.optional().default(x)`, emits the
// property as *required* and carrying a default - a schema that contradicts itself
// and forces every caller to pass a value the description calls optional.
const limitParam = {
    limit: z.number().int().min(1).max(50).default(10).optional().describe('Maximum number of records to return (1-50, default 10)')
}
const basePagination = { ...cursorParam, ...limitParam }

// Only Device.getAll and Project.byTeam read page and compute an offset.
const pageParam = {
    page: z.number().int().min(1).default(1).optional().describe('1-based page number (offset pagination)')
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

// The single shape for an error raised by a tool itself, rather than by the backing
// route. Mirrors what app.inject() would hand back for a real API error, so
// formatResponse() treats both identically and callers see one consistent envelope.
function toolError (statusCode, code, error) {
    return { statusCode, json: () => ({ code, error }) }
}

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
    gitStageFields,
    gitStageFieldKeys,
    snapshotComponents,
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
    appendQuery,
    toolError
}
