/**
 * Create MCPGrants and MCPGrantTeamPermissions tables for MCP token tool permissions
 */

const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        await context.createTable('MCPGrants', {
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

        await context.addIndex('MCPGrants', {
            name: 'mcp_grants_access_token_unique',
            fields: ['AccessTokenId'],
            unique: true
        })

        await context.createTable('MCPGrantTeamPermissions', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            MCPGrantId: {
                type: DataTypes.INTEGER,
                references: { model: 'MCPGrants', key: 'id' },
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

        await context.addIndex('MCPGrantTeamPermissions', {
            name: 'mcp_grant_team_permissions_unique',
            fields: ['MCPGrantId', 'TeamId'],
            unique: true
        })
    },
    down: async (context) => {}
}
