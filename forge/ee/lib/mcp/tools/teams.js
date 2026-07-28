const { z } = require('zod')

const { redactDatabaseCredentials } = require('../utils')

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
            teamId: z.string().describe('The ID or hashid of the team')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}` })
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
            teamId: z.string().describe('The ID or hashid of the team')
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
            teamId: z.string().describe('The ID or hashid of the team'),
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
            Each entry includes the schema it lives in; if the same table name appears under more than one schema, pass that schema to platform_get_database_table or platform_query_database_table_data to pick the right one.
            FlowFuse Tables is a plan-gated feature; if it is not enabled for the team's plan, the underlying API's error response is returned as-is.
            Use platform_get_database_table to get the full schema of a single table, or platform_query_database_table_data to read row data.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().describe('The ID or hashid of the team'),
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
            schemaName is required, since the same table name can exist in more than one schema; get it from platform_list_database_tables.
            FlowFuse Tables is a plan-gated feature; if it is not enabled for the team's plan, the underlying API's error response is returned as-is.
            Use platform_query_database_table_data to read row data instead.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().describe('The ID or hashid of the team'),
            databaseId: z.string().describe('database hashid'),
            tableName: z.string().describe('Name of the database table'),
            schemaName: z.string().describe('Schema the table lives in, as returned by platform_list_database_tables')
        },
        handler: async (args, { inject }) => {
            const url = `/api/v1/teams/${args.teamId}/databases/${args.databaseId}/tables/${args.tableName}/${encodeURIComponent(args.schemaName)}`
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_query_database_table_data',
        title: 'Query Database Table Data',
        description: `FlowFuse platform automation tool:
            Reads the row data of a table in a FlowFuse Tables database. There are no column-filter parameters; this returns rows as stored.
            At most 10 rows are returned per call (the limit is capped at 10 by the platform).
            schemaName is required, since the same table name can exist in more than one schema; get it from platform_list_database_tables.
            FlowFuse Tables is a plan-gated feature; if it is not enabled for the team's plan, the underlying API's error response is returned as-is.
            Use platform_get_database_table first if you need to know the column names and types.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().describe('The ID or hashid of the team'),
            databaseId: z.string().describe('database hashid'),
            tableName: z.string().describe('Name of the database table'),
            schemaName: z.string().describe('Schema the table lives in, as returned by platform_list_database_tables'),
            limit: z.number().int().min(1).max(10).default(10).describe('Maximum number of rows to return (1-10, default 10)')
        },
        handler: async (args, { inject }) => {
            const url = `/api/v1/teams/${args.teamId}/databases/${args.databaseId}/tables/${args.tableName}/data/${encodeURIComponent(args.schemaName)}${args.limit !== undefined ? `?limit=${encodeURIComponent(args.limit)}` : ''}`
            const response = await inject({ method: 'GET', url })
            return response
        }
    }
]
