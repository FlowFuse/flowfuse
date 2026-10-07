const { z } = require('zod')

const { toolError } = require('../schemas')
const {
    teamIdSchema,
    databaseIdSchema,
    tableNameSchema,
    schemaNameSchema,
    databaseSchema,
    countSchema,
    recordSchema
} = require('../tool-schemas/tables')
const { redactDatabaseCredentials, emptySuccessAsOkay } = require('../utils')

const isHashid = (id) => /^[A-Za-z0-9]+$/.test(id)

module.exports = [
    {
        name: 'platform_list_team_databases',
        title: 'List Team Databases',
        description: `FlowFuse platform automation tool:
            Lists the FlowFuse Tables databases for a team.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId: teamIdSchema
        },
        outputSchema: {
            databases: z.array(databaseSchema)
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/databases` })
            if (response.statusCode >= 400) {
                return response
            }
            const databases = response.json().map(redactDatabaseCredentials)
            return {
                statusCode: response.statusCode,
                json: () => ({ databases })
            }
        }
    },
    {
        name: 'platform_get_team_database',
        title: 'Get Team Database',
        description: `FlowFuse platform automation tool:
            Gets a single FlowFuse Tables database for a team.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId: teamIdSchema,
            databaseId: databaseIdSchema
        },
        outputSchema: {
            database: databaseSchema
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/databases/${args.databaseId}` })
            if (response.statusCode >= 400) {
                return response
            }
            const database = redactDatabaseCredentials(response.json())
            return {
                statusCode: response.statusCode,
                json: () => ({ database })
            }
        }
    },
    {
        name: 'platform_list_database_tables',
        title: 'List Database Tables',
        description: `FlowFuse platform automation tool:
            Lists the tables defined in a FlowFuse Tables database. The full list is returned; this endpoint does not paginate.
            Each entry includes the schema it lives in; if the same table name appears under more than one schema, pass that schema to platform_get_database_table or platform_query_database_table_data to pick the right one.
            Use platform_get_database_table to get the full schema of a single table, or platform_query_database_table_data to read row data.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId: teamIdSchema,
            databaseId: databaseIdSchema
        },
        outputSchema: {
            count: countSchema,
            tables: z.array(z.object({
                name: z.string(),
                schema: z.string()
            })),
            meta: recordSchema
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
            Gets the schema definition of a single table in a FlowFuse Tables database (column names, types, and constraints).
            schemaName is required, since the same table name can exist in more than one schema; get it from platform_list_database_tables.
            Use platform_query_database_table_data to read row data instead.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId: teamIdSchema,
            databaseId: databaseIdSchema,
            tableName: tableNameSchema,
            schemaName: schemaNameSchema
        },
        outputSchema: {
            database: databaseIdSchema,
            tableName: tableNameSchema,
            schemaName: schemaNameSchema,
            columns: z.array(z.object({
                name: z.string(),
                type: z.string()
            }).loose())
        },
        handler: async (args, { inject }) => {
            const url = `/api/v1/teams/${args.teamId}/databases/${args.databaseId}/tables/${encodeURIComponent(args.tableName)}/${encodeURIComponent(args.schemaName)}`
            const response = await inject({ method: 'GET', url })
            if (response.statusCode >= 400) {
                return response
            }
            const columns = response.json()
            return {
                statusCode: response.statusCode,
                json: () => ({
                    database: args.databaseId,
                    tableName: args.tableName,
                    schemaName: args.schemaName,
                    columns
                })
            }
        }
    },
    {
        name: 'platform_query_database_table_data',
        title: 'Query Database Table Data',
        description: `FlowFuse platform automation tool:
            Reads the row data of a table in a FlowFuse Tables database. There are no column-filter parameters; this returns rows as stored.
            At most 10 rows are returned per call (the limit is capped at 10 by the platform).
            schemaName is required, since the same table name can exist in more than one schema; get it from platform_list_database_tables.
            Use platform_get_database_table first if you need to know the column names and types.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId: teamIdSchema,
            databaseId: databaseIdSchema,
            tableName: tableNameSchema,
            schemaName: schemaNameSchema,
            limit: z.number().int().min(1).max(10).default(10).optional().describe('Maximum number of rows to return (1-10, default 10)')
        },
        outputSchema: {
            count: countSchema,
            rows: z.array(recordSchema),
            meta: recordSchema
        },
        handler: async (args, { inject }) => {
            const basePath = `/api/v1/teams/${args.teamId}/databases/${args.databaseId}/tables/${encodeURIComponent(args.tableName)}/data/${encodeURIComponent(args.schemaName)}`
            const params = new URLSearchParams()
            if (args.limit !== undefined) {
                params.set('limit', String(args.limit))
            }
            const qs = params.toString()
            const url = `${basePath}${qs ? `?${qs}` : ''}`
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_create_database_table',
        title: 'Create Database Table',
        description: `FlowFuse platform automation tool:
            Creates a new table in a FlowFuse Tables database.
            Fails with 409 if a table of that name already exists in the same schema.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            teamId: teamIdSchema,
            databaseId: databaseIdSchema,
            name: z.string().min(1).describe('Name for the new table'),
            schema: z.string().regex(/^(?!pg_)(?!information_schema$)[a-zA-Z_][a-zA-Z0-9_]{0,62}$/).optional().describe('Schema to create the table in. Defaults to public, and is created if it does not exist'),
            columns: z.array(z.object({
                name: z.string().min(1).describe('Column name'),
                type: z.enum(['bigint', 'bigserial', 'boolean', 'date', 'timestamptz', 'real', 'double precision', 'text']).describe('Column data type'),
                nullable: z.boolean().optional().describe('Whether the column allows NULL. Defaults to NOT NULL when omitted'),
                default: z.string().nullable().optional().describe('Default value, or null for none'),
                generated: z.boolean().optional().describe('Whether the column value is generated'),
                maxLength: z.number().nullable().optional().describe('Maximum length, or null for unbounded')
            })).min(1).describe('Column definitions for the new table')
        },
        outputSchema: {
            table: z.object({
                name: z.string(),
                schema: z.string()
            })
        },
        handler: async (args, { inject }) => {
            const payload = { name: args.name, columns: args.columns }
            if (args.schema) {
                payload.schema = args.schema
            }
            const response = await inject({
                method: 'POST',
                url: `/api/v1/teams/${args.teamId}/databases/${args.databaseId}/tables`,
                payload
            })
            if (response.statusCode >= 400) {
                return response
            }
            // The route replies to a successful create with an empty body
            return {
                statusCode: response.statusCode,
                json: () => ({ table: { name: args.name, schema: args.schema || 'public' } })
            }
        }
    },
    {
        name: 'platform_delete_database_table',
        title: 'Delete Database Table',
        description: `FlowFuse platform automation tool:
            Permanently deletes a table from a FlowFuse Tables database, including every row it holds. This cannot be undone and there is no backup to restore from.
            CAUTION: any flow that reads or writes the table will start failing as soon as it is gone. Confirm with the user before calling this, and use platform_get_database_table and platform_query_database_table_data first so you can tell them what is being lost.
            Only the table in the given schema is deleted; a table with the same name in another schema is left alone. Team owners only.
            Replies { status: "okay" } on success; a table or database that does not exist returns 404, so repeating a call is harmless. A 404 can also mean FlowFuse Tables is not available to the team.`,
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId: teamIdSchema,
            databaseId: databaseIdSchema,
            tableName: tableNameSchema,
            schemaName: schemaNameSchema
        },
        handler: async (args, { inject }) => {
            if (!isHashid(args.teamId) || !isHashid(args.databaseId)) {
                return toolError(400, 'invalid_request', 'teamId and databaseId must be hashids')
            }
            const url = `/api/v1/teams/${args.teamId}/databases/${args.databaseId}/tables/${encodeURIComponent(args.tableName)}/${encodeURIComponent(args.schemaName)}`
            const response = await inject({ method: 'DELETE', url })
            return emptySuccessAsOkay(response)
        }
    },
    {
        name: 'platform_delete_team_database',
        title: 'Delete Team Database',
        description: `FlowFuse platform automation tool:
            Permanently deletes a team's FlowFuse Tables database: every table in every schema, all of their rows, and the database login. This cannot be undone and there is no backup to restore from.
            CAUTION: every flow and device in the team that uses the database will start failing, and the team is left with no database until a new one is created. Confirm with the user before calling this, and list what is in it first with platform_list_database_tables so you can tell them what will be lost.
            The database does not need to be empty. Team owners only.
            Replies { status: "okay" } on success; a database that does not exist returns 404, so repeating a call is harmless. A 404 can also mean FlowFuse Tables is not available to the team.`,
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId: teamIdSchema,
            databaseId: databaseIdSchema
        },
        handler: async (args, { inject }) => {
            if (!isHashid(args.teamId) || !isHashid(args.databaseId)) {
                return toolError(400, 'invalid_request', 'teamId and databaseId must be hashids')
            }
            const response = await inject({ method: 'DELETE', url: `/api/v1/teams/${args.teamId}/databases/${args.databaseId}` })
            if (response.statusCode >= 400) {
                return response
            }
            return { statusCode: response.statusCode, json: () => ({ status: 'okay' }) }
        }
    }
]
