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
    getDatabase: async (team) => {
        if (this._driver.getDatabase) {
            return this._driver.getDatabase(team)
        } else {
            throw new Error('Database driver does not support getDatabase')
        }
    },
    createDatabase: async (team) => {
        if (this._driver.createDatabase) {
            return this._driver.createDatabase(team)
        } else {
            throw new Error('Database driver does not support createDatabase')
        }
    },
    destroyDatabase: async (team) => {
        if (this._driver.destroyDatabase) {
            return this._driver.destroyDatabase(team)
        } else {
            throw new Error('Database driver does not support destroyDatabase')
        }
    },
    getTables: async (team, database) => {
        if (this._driver.getTables) {
            return this._driver.getTables(team, database)
        } else {
            throw new Error('Database driver does not support getTables')
        }
    },
    getTable: async (team, database, table) => {
        if (this._driver.getTable) {
            return this._driver.getTable(team, database, table)
        } else {
            throw new Error('Database driver does not support getTable')
        }
    },
    createTable: async (team, database, table) => {
        if (this._driver.createTable) {
            return this._driver.createTable(team, database, table)
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
    getColumns: async (team, database, table) => {
        if (this._driver.getColumns) {
            return this._driver.getColumns(team, database, table)
        } else {
            throw new Error('Database driver does not support getColumns')
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
