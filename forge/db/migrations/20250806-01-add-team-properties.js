/**
 * Add 'properties' to Teams table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('Teams', 'properties', {
            type: DataTypes.TEXT
        })
    },
    down: async (context) => {
    }
}
