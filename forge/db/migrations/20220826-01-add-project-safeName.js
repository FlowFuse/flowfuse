/* eslint-disable no-unused-vars */
/**
 * Add safeName column to Projects table
 */
const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('Projects', 'safeName', { type: DataTypes.STRING })
        // NOTE: There are no constraints applied until the next migration
        // because the addColumn call will fail if [projects] has existing rows
    },
    down: async (context) => {
    }
}
