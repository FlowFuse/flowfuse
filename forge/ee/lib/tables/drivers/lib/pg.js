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
// How many bytes of a binary value are sent as its preview
const BINARY_PREVIEW_BYTES = 32

const asStored = value => value
// Numbers stay numbers, but NaN and Infinity have no JSON form and would otherwise turn into null
const parseFloatValue = value => {
    const number = parseFloat(value)
    return Number.isFinite(number) ? number : value
}
// Postgres sends bytea as `\x` followed by hex. Send its size and the first bytes, not every byte
const parseBinaryValue = value => {
    const hex = value.startsWith('\\x') ? value.slice(2) : Buffer.from(value, 'binary').toString('hex')
    return { bytes: hex.length / 2, hex: hex.slice(0, BINARY_PREVIEW_BYTES * 2) }
}
const arrayOf = parser => value => pg.types.arrayParser.create(value, parser).parse()

// Postgres type OIDs, see pg_type
const tableDataParsers = {
    17: parseBinaryValue, // bytea
    1001: arrayOf(parseBinaryValue),
    700: parseFloatValue, // float4
    1021: arrayOf(parseFloatValue),
    701: parseFloatValue, // float8
    1022: arrayOf(parseFloatValue),
    1082: asStored, // date
    1182: arrayOf(asStored),
    1114: asStored, // timestamp without time zone
    1115: arrayOf(asStored),
    1186: asStored, // interval
    1187: arrayOf(asStored),
    600: asStored, // point
    1017: arrayOf(asStored),
    718: asStored, // circle
    719: arrayOf(asStored)
}

/**
 * Type parsers for a client that reads table rows to show them to someone, rather than to compute with them.
 *
 * By default the pg client turns some types into JS values that do not survive being sent as JSON:
 * a date or a timestamp without a time zone becomes a Date in the server's time zone (so it shifts),
 * NaN and Infinity become null, bytea becomes an array with a number per byte, and intervals, points and
 * circles become objects. These parsers hand those back as Postgres wrote them. Every other type keeps
 * its default parser, so integers, booleans, JSON and timestamps with a time zone are unchanged.
 */
const tableDataTypes = {
    getTypeParser: (oid, format) => tableDataParsers[oid] ?? pg.types.getTypeParser(oid, format)
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
    tableDataTypes,
    pg
}
