/**
 * Add toolPermissions column to AccessTokens for MCP token tool permissions
 */

const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        await context.addColumn('AccessTokens', 'toolPermissions', {
            type: DataTypes.TEXT,
            allowNull: true
        })
    },
    down: async (context) => {}
}
