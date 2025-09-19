/**
 * Add 'interval' to Subscriptions table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('TeamMembers', 'permissions', {
            type: DataTypes.TEXT,
            allowNull: true
        })
    },
    down: async (context) => {
    }
}
