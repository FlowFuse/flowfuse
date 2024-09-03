/**
 * Add suspended to Team table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('Teams', 'suspended', {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        })
    },
    down: async (context) => {
    }
}
