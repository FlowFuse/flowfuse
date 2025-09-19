/**
 * Add SSO Groups to Users
 */

const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        await context.addColumn('Users', 'SSOGroups', {
            type: DataTypes.STRING,
            allowNull: true
        })
    },
    down: async (context) => {
    }
}
