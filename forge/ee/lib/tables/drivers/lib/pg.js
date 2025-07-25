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
module.exports = {
    newClient,
    pg
}
