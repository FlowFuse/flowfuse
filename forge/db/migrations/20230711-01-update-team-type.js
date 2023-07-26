/**
 * Add order to TeamType table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        const dialect = context.sequelize.options.dialect
        if (dialect === 'sqlite') {
            // Disable foreign_keys so that when sequelize does its sqlite-specific
            // copy/drop workaround for renaming columns, we don't cause cascade
            // delete on the Teams table
            await context.sequelize.query('PRAGMA foreign_keys = 0;')
        }

        await context.renameColumn('TeamTypes', 'enabled', 'active')

        await context.addColumn('TeamTypes', 'order', {
            type: DataTypes.INTEGER,
            defaultValue: 0
        })
        if (dialect === 'sqlite') {
            await context.sequelize.query('PRAGMA foreign_keys = 1;')
        }
    },
    down: async (context) => {
    }
}
