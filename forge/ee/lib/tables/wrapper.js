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
            return this._driver.createDatabase(team, name)
        } else {
            throw new Error('Database driver does not support createDatabase')
        }
    },
    destroyDatabase: async (team, databaseId) => {
        if (this._driver.destroyDatabase) {
            return this._driver.destroyDatabase(team, databaseId)
        } else {
            throw new Error('Database driver does not support destroyDatabase')
        }
    },
    getTables: async (team, databaseId) => {
        if (this._driver.getTables) {
            return this._driver.getTables(team, databaseId)
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
    getTableData: async (team, database, table, rows = 10) => {
        if (this._driver.getTableData) {
            return this._driver.getTableData(team, database, table, rows)
        } else {
            throw new Error('Database driver does not support getTableData')
        }
    },
    createTable: async (team, databaseId, table) => {
        if (this._driver.createTable) {
            return this._driver.createTable(team, databaseId, table)
        } else {
            throw new Error('Database driver does not support createTable')
        }
    },
    dropTable: async (team, database, table) => {
        if (this._driver.dropTable) {
            return this._driver.dropTable(team, database, table)
        } else {
            throw new Error('Database driver does not support dropTable')
        }
    },
    removeColumn: async (team, database, table, column) => {
        if (this._driver.removeColumn) {
            return this._driver.removeColumn(team, database, table, column)
        } else {
            throw new Error('Database driver does not support removeColumn')
        }
    },
    addColumn: async (team, database, table, column) => {
        if (this._driver.addColumn) {
            return this._driver.addColumn(team, database, table, column)
        } else {
            throw new Error('Database driver does not support addColumn')
        }
    }
}
