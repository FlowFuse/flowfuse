/**
 * Add versions to Project table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('Projects', 'versions', {
            type: DataTypes.TEXT,
            defaultValue: null
        })
    },
    down: async (context) => {
    }
}
