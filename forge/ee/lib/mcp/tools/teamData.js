const { z } = require('zod')

const { teamId, appendQuery } = require('../schemas')

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
