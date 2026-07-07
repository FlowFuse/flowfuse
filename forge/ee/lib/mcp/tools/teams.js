const { z } = require('zod')

const { teamId, basePagination, basePaginationKeys, searchQuery, searchQueryKeys, auditLogFilters, auditLogFilterKeys, appendQuery } = require('../schemas')

// Audit-log routes accept cursor+limit pagination, free-text query, event
// (single name or array) and username. scope narrows which entity levels are
// returned; includeChildren pulls in descendant entries within the chosen scope.
const includeChildren = z.boolean().optional().describe('Also include audit entries from child entities within the chosen scope')
const auditLogInput = { ...basePagination, ...searchQuery, ...auditLogFilters }
const auditLogKeys = [...basePaginationKeys, ...searchQueryKeys, ...auditLogFilterKeys]

// Strips credentials (including the password) before returning results to the caller.
function redactDatabaseCredentials (database) {
    if (!database) {
        return database
    }
    const { credentials, ...rest } = database
    return rest
}

module.exports = [
    {
        name: 'platform_list_teams',
        title: 'List Teams',
        description: 'FlowFuse platform automation tool: List all teams the authenticated user belongs to. Returns team names, slugs, IDs, and membership roles.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/user/teams' })
            return response
        }
    },
    {
        name: 'platform_get_team',
        title: 'Get Team',
        description: 'FlowFuse platform automation tool: Get details of a specific team by its ID, including team type, member count, hosted instance and remote instance counts.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}` })
            return response
        }
    },
    {
        name: 'platform_get_team_by_slug',
        title: 'Get Team By Slug',
        description: `FlowFuse platform automation tool:
            Gets details of a specific team using its slug (URL identifier) instead of its hashid.
            Use this when you only know the team's slug, for example from a URL, and need the same details as platform_get_team.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamSlug: z.string().regex(/^[a-z0-9-_]+$/i).describe('Team slug (URL identifier; lowercase letters, digits, hyphen and underscore)')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/slug/${args.teamSlug}` })
            return response
        }
    },
    {
        name: 'platform_get_team_instance_counts',
        title: 'Get Team Instance Counts',
        description: `FlowFuse platform automation tool:
            Counts a team's instances of the given type, optionally narrowed by state and application.
            instanceType is required: use "hosted" for hosted instances or "remote" for remote instances (devices).
            Use this for quick totals instead of listing and counting every instance yourself.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            instanceType: z.enum(['remote', 'hosted']).describe('Instance type to count'),
            state: z.array(z.string()).optional().describe('Optional list of instance states to filter the counts by (defaults to empty)'),
            applicationId: z.string().optional().describe('Application hashid to scope the counts to a single application')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/instance-counts`, args, ['instanceType', 'state', 'applicationId'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_check_team_slug_availability',
        title: 'Check Team Slug Availability',
        description: `FlowFuse platform automation tool:
            Checks whether a team slug is available before creating a team. This does not create or change anything.
            The value "create" is reserved and is always rejected.
            Use this before calling a team creation tool to make sure the chosen slug is not already taken.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            slug: z.string().regex(/^[a-z0-9-_]+$/i).describe('Team slug to check; lowercase letters, digits, hyphen and underscore')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'POST', url: '/api/v1/teams/check-slug', payload: { slug: args.slug } })
            return response
        }
    },
    {
        name: 'platform_get_team_membership',
        title: 'Get Team Membership',
        description: `FlowFuse platform automation tool:
            Gets the authenticated user's own membership (role) in a team.
            Use this to check what role the current user holds in a team before attempting an action that needs a specific role.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/user` })
            return response
        }
    },
    {
        name: 'platform_list_team_members',
        title: 'List Team Members',
        description: `FlowFuse platform automation tool:
            Lists the members of a team, including their role and, when SSO is enabled, whether their membership is SSO-managed.
            Use this to see who belongs to a team before inviting, removing, or changing the role of a member.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/members` })
            return response
        }
    },
    {
        name: 'platform_list_team_invitations',
        title: 'List Team Invitations',
        description: `FlowFuse platform automation tool:
            Lists the pending invitations for a team.
            This requires the Owner role, so a non-Owner credential will get an access error even though this tool itself is read-only.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/invitations` })
            return response
        }
    },
    {
        name: 'platform_get_team_audit_log',
        title: 'Get Team Audit Log',
        description: `FlowFuse platform automation tool:
            Reads the audit log for a team, showing events like membership changes, billing changes,
            and administrative actions taken across the team's applications, instances, and devices.
            A team-scoped PAT only sees audit log entries for teams it is scoped to.
            Use this when the user asks what happened on a team, or wants to investigate recent changes.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            ...auditLogInput,
            scope: z.enum(['team', 'application', 'project', 'device']).optional().describe('Entity level to include (default team)'),
            includeChildren
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/audit-log`, args, [...auditLogKeys, 'scope', 'includeChildren'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_export_team_audit_log',
        title: 'Export Team Audit Log',
        description: `FlowFuse platform automation tool:
            Exports the team audit log as a CSV file.
            Use this when the user wants a downloadable or shareable copy of the team's audit history,
            rather than reading entries directly with platform_get_team_audit_log.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            ...auditLogInput,
            scope: z.enum(['team', 'application', 'project', 'device']).optional().describe('Entity level to include (default team)'),
            includeChildren
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/audit-log/export`, args, [...auditLogKeys, 'scope', 'includeChildren'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_list_team_databases',
        title: 'List Team Databases',
        description: `FlowFuse platform automation tool:
            Lists the FlowFuse Tables databases for a team.
            FlowFuse Tables is a plan-gated feature; if it is not enabled for the team's plan, the underlying API's error response is returned as-is.
            The underlying API response includes a credentials object with connection details, including a password. This tool strips that object before returning results, so no credentials are ever exposed.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/databases` })
            if (response.statusCode >= 400) {
                return response
            }
            const databases = response.json().map(redactDatabaseCredentials)
            return {
                statusCode: response.statusCode,
                json: () => databases
            }
        }
    },
    {
        name: 'platform_get_team_database',
        title: 'Get Team Database',
        description: `FlowFuse platform automation tool:
            Gets a single FlowFuse Tables database for a team.
            FlowFuse Tables is a plan-gated feature; if it is not enabled for the team's plan, the underlying API's error response is returned as-is.
            The underlying API response includes a credentials object with connection details, including a password. This tool strips that object before returning the result, so no credentials are ever exposed.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            databaseId: z.string().describe('database hashid')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/databases/${args.databaseId}` })
            if (response.statusCode >= 400) {
                return response
            }
            const database = redactDatabaseCredentials(response.json())
            return {
                statusCode: response.statusCode,
                json: () => database
            }
        }
    },
    {
        name: 'platform_list_database_tables',
        title: 'List Database Tables',
        description: `FlowFuse platform automation tool:
            Lists the tables defined in a FlowFuse Tables database. The full list is returned; this endpoint does not paginate.
            FlowFuse Tables is a plan-gated feature; if it is not enabled for the team's plan, the underlying API's error response is returned as-is.
            Use platform_get_database_table to get the full schema of a single table, or platform_query_database_table_data to read row data.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            databaseId: z.string().describe('database hashid')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/databases/${args.databaseId}/tables` })
            return response
        }
    },
    {
        name: 'platform_get_database_table',
        title: 'Get Database Table',
        description: `FlowFuse platform automation tool:
            Gets the schema definition of a single table in a FlowFuse Tables database (column names, types, and constraints). Does not return row data or credentials.
            FlowFuse Tables is a plan-gated feature; if it is not enabled for the team's plan, the underlying API's error response is returned as-is.
            Use platform_query_database_table_data to read row data instead.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            databaseId: z.string().describe('database hashid'),
            tableName: z.string().describe('Name of the database table')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/databases/${args.databaseId}/tables/${args.tableName}` })
            return response
        }
    },
    {
        name: 'platform_query_database_table_data',
        title: 'Query Database Table Data',
        description: `FlowFuse platform automation tool:
            Reads the row data of a table in a FlowFuse Tables database. There are no column-filter parameters; this returns rows as stored.
            At most 10 rows are returned per call (the limit is capped at 10 by the platform).
            FlowFuse Tables is a plan-gated feature; if it is not enabled for the team's plan, the underlying API's error response is returned as-is.
            Use platform_get_database_table first if you need to know the column names and types.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            databaseId: z.string().describe('database hashid'),
            tableName: z.string().describe('Name of the database table'),
            limit: z.number().int().min(1).max(10).default(10).describe('Maximum number of rows to return (1-10, default 10)')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/databases/${args.databaseId}/tables/${args.tableName}/data`, args, ['limit'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_list_team_npm_packages',
        title: 'List Team NPM Packages',
        description: `FlowFuse platform automation tool:
            Lists the private npm packages owned by a team.
            The npm registry is a plan-gated feature; if it is not enabled for the team's plan, or the team does not exist, the underlying API's error response is returned as-is.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/npm/packages` })
            return response
        }
    },
    {
        name: 'platform_list_team_git_tokens',
        title: 'List Team Git Tokens',
        description: `FlowFuse platform automation tool:
            Lists the git tokens configured for a team. The response never includes the raw stored personal access token, only its ID, name, and type.
            Git integration is a plan-gated feature; if it is not enabled for the team's plan, or the team does not exist, the underlying API's error response is returned as-is.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/git/tokens` })
            return response
        }
    },
    {
        name: 'platform_list_library_entries',
        title: 'List Library Entries',
        description: `FlowFuse platform automation tool:
            Lists entries in the team shared library (reusable flows, functions, and other snippets shared across a team's hosted and remote instances).
            Pass an empty path to list the library root, or a folder path to list its contents.
            The shared library is enabled by default, but a team may still not exist or the caller may not be a member; either case returns the underlying API's error response as-is.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            libraryId: z.string().describe('shared-library hashid (the team hashid)'),
            path: z.string().default('').describe('Library entry path; empty string lists the library root'),
            type: z.string().optional().describe('entry type filter query param (e.g. flows, functions)')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/storage/library/${args.libraryId}/${args.path || ''}`, args, ['type'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    }
]
