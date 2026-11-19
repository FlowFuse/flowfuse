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

/**
 * Cancels whatever query a client is running once the signal aborts, so that a read nobody is
 * waiting for any more stops using the database rather than running to its end.
 *
 * Closing the client's connection is not enough: Postgres only notices that when it comes to send
 * the result. So a second, short lived connection asks Postgres to cancel the first one's query,
 * which then fails with "canceling statement due to user request".
 * @param {pg.Client} client - The client whose query is to be cancelled
 * @param {AbortSignal} [signal] - Aborts when the work is no longer wanted. Nothing is done without one
 * @param {pg.ClientConfig} databaseOptions - Options to connect to the same database as the client
 * @returns {Function} to be called once the client is finished with, so nothing is cancelled after that
 */
function cancelOnAbort (client, signal, databaseOptions) {
    if (!signal) {
        return () => {}
    }
    const cancel = async () => {
        const canceller = newClient(databaseOptions)
        try {
            await canceller.connect()
            await canceller.query('SELECT pg_cancel_backend($1)', [client.processID])
        } catch (err) {
            // the query carries on until it ends or times out, as it did before it could be cancelled
        } finally {
            canceller.end().catch(() => {})
        }
    }
    signal.addEventListener('abort', cancel, { once: true })
    return () => signal.removeEventListener('abort', cancel)
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
// A timestamp with a time zone stays a Date, but infinity has no date form and would otherwise turn into null
const defaultTimestamptzParser = pg.types.getTypeParser(1184)
const parseTimestamptzValue = value => {
    if (value === 'infinity' || value === '-infinity') {
        return value
    }
    return defaultTimestamptzParser(value)
}
const arrayOf = parser => value => pg.types.arrayParser.create(value, parser).parse()

// Each type that needs its own parser, as [type OID, OID of its array type, parser]. See pg_type for the OIDs.
// A type and its array sit side by side so one is not covered without the other.
const tableDataParsers = Object.fromEntries([
    [17, 1001, parseBinaryValue], // bytea
    [700, 1021, parseFloatValue], // float4
    [701, 1022, parseFloatValue], // float8
    [1082, 1182, asStored], // date
    [1114, 1115, asStored], // timestamp without time zone
    [1184, 1185, parseTimestamptzValue], // timestamp with time zone
    [1186, 1187, asStored], // interval
    [600, 1017, asStored], // point
    [718, 719, asStored], // circle
    // numeric is text by default, but the default parser for its array turns the items into floats
    [1700, 1231, asStored],
    // JSON stays the text Postgres wrote. Once parsed, a JSON null is the same null as a cell with no value,
    // big numbers are rounded, and json (unlike jsonb) loses the spacing and key order it was saved with
    [114, 199, asStored], // json
    [3802, 3807, asStored] // jsonb
].flatMap(([oid, arrayOid, parser]) => [[oid, parser], [arrayOid, arrayOf(parser)]]))

/**
 * Type parsers for a client that reads table rows to show them to someone, rather than to compute with them.
 *
 * By default the pg client turns some types into JS values that do not survive being sent as JSON:
 * a date or a timestamp without a time zone becomes a Date in the server's time zone (so it shifts),
 * NaN and Infinity become null, bytea becomes an array with a number per byte, and intervals, points and
 * circles become objects, the items of a numeric array become floats, a timestamp with a time zone holding
 * infinity becomes null, and a JSON null becomes the same null as a cell with no value. These parsers hand those
 * back as Postgres wrote them. Every other type keeps its default parser, so integers, booleans and every other
 * timestamp with a time zone are unchanged.
 */
const tableDataTypes = {
    getTypeParser: (oid, format) => tableDataParsers[oid] ?? pg.types.getTypeParser(oid, format)
}

/**
 * The name of a table as it goes into a query: escaped, with its schema in front when it has one.
 * @param {{ schema?: string, tableName: string }} table - The plain, unescaped names of the table and its schema
 * @returns {string} the escaped, schema qualified table name
 */
function qualifiedTableName ({ schema, tableName }) {
    const escapedName = pg.escapeIdentifier(tableName)
    return schema ? `${pg.escapeIdentifier(schema)}.${escapedName}` : escapedName
}

/**
 * Reads rows of a table that has no primary key, in the order they are physically stored.
 *
 * `ORDER BY ctid` gives that order too, but Postgres has no index on ctid, so it reads and sorts the
 * whole table to return even the first few rows. Reading the table from its start with no ORDER BY
 * returns the same rows in the same order and stops as soon as it has enough of them. That order is
 * how Postgres reads a table rather than something SQL promises, so the two settings below turn off
 * the only things that would change it: starting part way through the table to join a scan already
 * in progress, and splitting the read across parallel workers. Both are set for this transaction only.
 * @param {pg.Client} client - Client connected to the team database
 * @param {{ schema?: string, tableName: string }} table - The plain, unescaped names of the table and its schema
 * @param {number} limit - How many rows to read
 * @param {number} offset - How many rows to skip first
 */
async function getRowsInPhysicalOrder (client, table, limit, offset) {
    await client.query('BEGIN')
    try {
        await client.query('SET LOCAL synchronize_seqscans = off')
        await client.query('SET LOCAL max_parallel_workers_per_gather = 0')
        return (await client.query(`SELECT * FROM ${qualifiedTableName(table)} LIMIT $1 OFFSET $2`, [limit, offset])).rows
    } finally {
        // nothing was written, so there is nothing to commit
        await client.query('ROLLBACK')
    }
}

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
// the most rows that are counted, and so the most that can be paged through
const MAX_COUNTED_ROWS = 10000

// The Postgres error code (undefined_function) for "could not identify an ordering operator for type ..."
const NO_ORDERING_OPERATOR = '42883'

/**
 * The error for a sort that cannot be done, which is down to the request rather than the server.
 * It carries a statusCode and code so that it reaches the API as a 400 rather than a 500.
 * @param {string} message - What is wrong with the sort
 */
function invalidSortError (message) {
    return Object.assign(new Error(message), { statusCode: 400, code: 'invalid_sort' })
}

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
 * position, so that walking the pages of an unchanged table never repeats or skips a row.
 * Sorting by a column puts that column first and keeps this order behind it,
 * so rows holding the same value still come in a fixed order from one page to the next.
 * Rows with no value in the sorted column go where Postgres puts them: last when ascending,
 * first when descending.
 *
 * Counting every row means reading the whole table, which on a big one takes far longer than
 * fetching the page itself. So the count stops at MAX_COUNTED_ROWS: a table with more rows than
 * that is reported as `capped`, and its pages stop there as well.
 *
 * Sorting such a table by just any column also means reading the whole table, for every page. So a
 * capped table can only be sorted by the first column of its primary key, whose index already
 * holds the rows in that order.
 * @param {pg.Client} client - Client connected to the team database
 * @param {{ schema?: string, tableName: string }} table - The plain, unescaped names of the table and its schema
 * @param {{ page?: number, limit?: number, sort?: string, dir?: 'asc'|'desc' }} pagination - 1 based
 * page number and page size, and the column to sort by with its direction (ascending by default)
 * @param {AbortSignal} [signal] - Aborts when the rows are no longer wanted. A query that is running is cancelled
 * by cancelOnAbort, and the checks here stop the next one from starting when the cancel came between two of them
 * @throws an invalid sort error (see invalidSortError) when the column does not exist, cannot be put in order,
 * or the table is too big to be sorted by it
 */
async function getTableDataPage (client, table, pagination = {}, signal) {
    const qualifiedTable = qualifiedTableName(table)
    const pageSize = Math.min(Math.max(parseInt(pagination.limit) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE)
    const page = Math.max(parseInt(pagination.page) || 1, 1)

    const pkRes = await client.query('SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = $1::regclass AND i.indisprimary ORDER BY array_position(i.indkey, a.attnum)', [qualifiedTable])
    const primaryKey = pkRes.rows.map(row => row.attname)
    let orderBy = primaryKey.length > 0 ? primaryKey.map(column => pg.escapeIdentifier(column)).join(', ') : 'ctid'

    const { sort } = pagination
    if (sort) {
        const columnRes = await client.query('SELECT 1 FROM pg_attribute WHERE attrelid = $1::regclass AND attname = $2 AND attnum > 0 AND NOT attisdropped', [qualifiedTable, sort])
        if (columnRes.rows.length === 0) {
            throw invalidSortError(`The table has no column "${sort}" to sort by`)
        }
        orderBy = `${pg.escapeIdentifier(sort)} ${pagination.dir === 'desc' ? 'DESC' : 'ASC'}, ${orderBy}`
    }

    signal?.throwIfAborted()
    // one row more than the most that are counted, to tell a table of exactly that many rows from a bigger one
    const countRes = await client.query(`SELECT count(*) AS total FROM (SELECT 1 FROM ${qualifiedTable} LIMIT $1) AS counted`, [MAX_COUNTED_ROWS + 1])
    const capped = Number(countRes.rows[0].total) > MAX_COUNTED_ROWS
    const total = Math.min(Number(countRes.rows[0].total), MAX_COUNTED_ROWS)
    if (sort && capped && sort !== primaryKey[0]) {
        throw invalidSortError(`The table has too many rows to be sorted by "${sort}"`)
    }

    signal?.throwIfAborted()
    // a page past the rows that were counted is empty, and reading that deep into a table is slow
    const offset = (page - 1) * pageSize
    let rows = []
    if (offset < total && !sort && primaryKey.length === 0) {
        rows = await getRowsInPhysicalOrder(client, table, pageSize, offset)
    } else if (offset < total) {
        try {
            rows = (await client.query(`SELECT * FROM ${qualifiedTable} ORDER BY ${orderBy} LIMIT $1 OFFSET $2`, [pageSize, offset])).rows
        } catch (err) {
            // some types, json for one, have no order to them
            if (sort && err.code === NO_ORDERING_OPERATOR) {
                throw invalidSortError(`Column "${sort}" holds values that cannot be put in order`)
            }
            throw err
        }
    }
    return {
        count: total,
        capped,
        primaryKey,
        rows,
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
    cancelOnAbort,
    getTableDataPage,
    invalidSortError,
    tableDataTypes,
    pg
}
