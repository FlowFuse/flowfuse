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
module.exports = {
    newClient,
    dropTeamDatabase,
    pg
}
