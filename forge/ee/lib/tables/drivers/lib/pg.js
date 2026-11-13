const pg = require('pg')
/**
 * Creates a new PostgreSQL client instance.
 * @param {pg.ClientConfig} databaseOptions - Options for the database connection
 * @returns {pg.Client} - A new PostgreSQL client instance configured for the team
 */
function newClient (databaseOptions) {
    const clientOptions = {
        // carry over any additional options
        ...databaseOptions,
        // ensure common/required options are set
        host: databaseOptions.host,
        port: databaseOptions.port,
        ssl: databaseOptions.ssl,
        user: databaseOptions.user,
        password: databaseOptions.password,
        database: databaseOptions.database
    }

    return new pg.Client(clientOptions)
}

/**
 * Drops the database, user and role created for a team.
 * Every drop is IF EXISTS so a retry after a partial failure can finish the cleanup.
 * @param {pg.Client} adminClient - Client connected with admin rights
 * @param {string} hashid - The team hashid the database, user and role are named after
 */
async function dropTeamDatabase (adminClient, hashid) {
    await adminClient.query(`DROP DATABASE IF EXISTS ${pg.escapeIdentifier(hashid)}`)
    await adminClient.query(`DROP USER IF EXISTS ${pg.escapeIdentifier(hashid)}`)
    await adminClient.query(`DROP ROLE IF EXISTS ${pg.escapeIdentifier(hashid + '-role')}`)
}
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

/**
 * Reads one page of a table's rows, along with the table's total row count.
 *
 * This pages by offset (`page` + `limit`), the same shape the instances and devices lists
 * use for their numbered pages, and deliberately has no cursor mode like most other list
 * endpoints do. A cursor needs a unique column to resume from and user tables are not
 * guaranteed to have one (no primary key), it cannot jump to an arbitrary page or report
 * "page 3 of 52" as the Tables UI does, and it does not hold up once rows can be sorted
 * by any column.
 *
 * Rows are ordered by the primary key when there is one, otherwise by their physical
 * position (ctid), so that walking the pages of an unchanged table never repeats or
 * skips a row.
 * @param {pg.Client} client - Client connected to the team database
 * @param {string} qualifiedTable - The escaped, schema qualified table name
 * @param {{ page?: number, limit?: number }} pagination - 1 based page number and page size
 */
async function getTableDataPage (client, qualifiedTable, pagination = {}) {
    const pageSize = Math.min(Math.max(parseInt(pagination.limit) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE)
    const page = Math.max(parseInt(pagination.page) || 1, 1)

    const pkRes = await client.query('SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = $1::regclass AND i.indisprimary ORDER BY array_position(i.indkey, a.attnum)', [qualifiedTable])
    const orderBy = pkRes.rows.length > 0 ? pkRes.rows.map(row => pg.escapeIdentifier(row.attname)).join(', ') : 'ctid'

    const countRes = await client.query(`SELECT count(*) AS total FROM ${qualifiedTable}`)
    const total = Number(countRes.rows[0].total)

    const res = await client.query(`SELECT * FROM ${qualifiedTable} ORDER BY ${orderBy} LIMIT $1 OFFSET $2`, [pageSize, (page - 1) * pageSize])
    return {
        count: total,
        rows: res.rows,
        meta: {
            page,
            pageSize,
            total,
            pageCount: Math.max(1, Math.ceil(total / pageSize))
        }
    }
}

module.exports = {
    newClient,
    dropTeamDatabase,
    getTableDataPage,
    pg
}
