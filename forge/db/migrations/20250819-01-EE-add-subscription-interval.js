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
        await context.addColumn('Subscriptions', 'interval', {
            type: DataTypes.STRING,
            allowNull: true
        })
    },
    down: async (context) => {
    }
}
