const { z } = require('zod')

// Shared field schemas reused across the FlowFuse Tables tools, since the same
// database/table identifiers appear in both the input and output schemas.
const teamIdSchema = z.string().describe('The hashid of the team')
const databaseIdSchema = z.string().describe('The hashid of the FlowFuse Tables database')
const tableNameSchema = z.string().describe('Name of the database table')
const schemaNameSchema = z.string().describe('Schema the table lives in, as returned by platform_list_database_tables')
const databaseSchema = z.object({
    id: z.string(),
    name: z.string()
}).loose()
const countSchema = z.number()
const recordSchema = z.record(z.string(), z.any())

module.exports = {
    teamIdSchema,
    databaseIdSchema,
    tableNameSchema,
    schemaNameSchema,
    databaseSchema,
    countSchema,
    recordSchema
}
