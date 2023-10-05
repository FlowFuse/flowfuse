/**
 * Remove not null on ProjectSnapshots.ProjectId
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        const dialect = context.sequelize.options.dialect
        if (dialect === 'sqlite') {
            // Disable foreign_keys so that when sequelize does its sqlite-specific
            // copy/drop workaround for renaming columns, we don't cause cascade
            // delete on any other tables
            await context.sequelize.query('PRAGMA foreign_keys = 0;')
        }

        await context.changeColumn('ProjectSnapshots', 'ProjectId', {
            type: DataTypes.UUID,
            allowNull: true
        })

        if (dialect === 'sqlite') {
            await context.sequelize.query('PRAGMA foreign_keys = 1;')
        }
    },
    down: async (context) => {
    }
}
