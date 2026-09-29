/**
 * Create AccessTokenToolPermissions table for per-team MCP token tool permissions
 */

const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        await context.createTable('AccessTokenToolPermissions', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            AccessTokenId: {
                type: DataTypes.INTEGER,
                references: { model: 'AccessTokens', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                allowNull: false
            },
            TeamId: {
                type: DataTypes.INTEGER,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                allowNull: false
            },
            ApplicationId: {
                type: DataTypes.INTEGER,
                references: { model: 'Applications', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                allowNull: true
            },
            permissions: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false
            }
        })

        await context.addIndex('AccessTokenToolPermissions', {
            name: 'access_token_tool_permissions_unique',
            fields: ['AccessTokenId', 'TeamId', 'ApplicationId'],
            unique: true
        })
    },
    down: async (context) => {}
}
