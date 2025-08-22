module.exports = {
    /**
     * Initialize the tables module
     * @param {Object} app - The application instance
     * @param {Object} driver - The database driver
     * @param {Object} options - Additional options for initialization
     */
    init: async (app, driver, options) => {
        this._app = app
        this._driver = driver
        this._options = options || {}
        await driver.init(app, options)
    },
    shutdown: async () => {
        if (this._driver.shutdown) {
            return this._driver.shutdown()
        }
    },
    getDatabases: async (team) => {
        if (this._driver.getDatabases) {
            return this._driver.getDatabases(team)
        } else {
            throw new Error('Database driver does not support getDatabases')
        }
    },
    getDatabase: async (team, database) => {
        if (this._driver.getDatabase) {
            return this._driver.getDatabase(team, database)
        } else {
            throw new Error('Database driver does not support getDatabase')
        }
    },
    createDatabase: async (team, name) => {
        if (this._driver.createDatabase) {
            this._app.log.info(`Adding database for '${team.hashid}'`)
            return this._driver.createDatabase(team, name)
        } else {
            throw new Error('Database driver does not support createDatabase')
        }
    },
    destroyDatabase: async (team, databaseId) => {
        if (this._driver.destroyDatabase) {
            this._app.log.info(`Removing database '${databaseId}' for '${team.hashid}'`)
            return this._driver.destroyDatabase(team, databaseId)
        } else {
            throw new Error('Database driver does not support destroyDatabase')
        }
    },
    getTables: async (team, databaseId, paginationOptions) => {
        if (this._driver.getTables) {
            return this._driver.getTables(team, databaseId, paginationOptions)
        } else {
            throw new Error('Database driver does not support getTables')
        }
    },
    getTable: async (team, databaseId, tableName) => {
        if (this._driver.getTable) {
            return this._driver.getTable(team, databaseId, tableName)
        } else {
            throw new Error('Database driver does not support getTable')
        }
    },
    getTableData: async (team, databaseId, table, paginationOptions) => {
        if (this._driver.getTableData) {
            return this._driver.getTableData(team, databaseId, table, paginationOptions)
        } else {
            throw new Error('Database driver does not support getTableData')
        }
    },
    /**
     * Query data in tables
     * IMPORTANT: this method is primarily intended for internal usage (like getting AI schema hints)
     * @param {Object} team - The team object
     * @param {String} databaseId - The database ID
     * @param {String} queryText - The SQL query to execute
     * @param {Array} params - The parameters for the query
     * @returns {String} - The result(s) of the query
     * @throws {Error} - If the database does not exist
     */
    query: async (team, databaseId, queryText, params) => {
        if (this._driver.query) {
            return this._driver.query(team, databaseId, queryText, params)
        } else {
            throw new Error('Database driver does not support query')
        }
    },
    createTable: async (team, databaseId, tableName, columns) => {
        if (this._driver.createTable) {
            this._app.log.info(`Adding table '${tableName}' to database '${databaseId}' for '${team.hashid}'`)
            return this._driver.createTable(team, databaseId, tableName, columns)
        } else {
            throw new Error('Database driver does not support createTable')
        }
    },
    dropTable: async (team, databaseId, table) => {
        if (this._driver.dropTable) {
            this._app.log.info(`Removing table '${table}' to database '${databaseId}' for '${team.hashid}'`)
            return this._driver.dropTable(team, databaseId, table)
        } else {
            throw new Error('Database driver does not support dropTable')
        }
    },
    removeColumn: async (team, databaseId, table, column) => {
        if (this._driver.removeColumn) {
            return this._driver.removeColumn(team, databaseId, table, column)
        } else {
            throw new Error('Database driver does not support removeColumn')
        }
    },
    addColumn: async (team, databaseId, table, column) => {
        if (this._driver.addColumn) {
            return this._driver.addColumn(team, databaseId, table, column)
        } else {
            throw new Error('Database driver does not support addColumn')
        }
    }
}
