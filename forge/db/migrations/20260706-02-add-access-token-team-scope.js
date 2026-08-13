/**
 * Create AccessTokenTeamScopes join table for PAT team scoping
 */

const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        await context.createTable('AccessTokenTeamScopes', {
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
            UserId: {
                type: DataTypes.INTEGER,
                references: { model: 'Users', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
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

        await context.addIndex('AccessTokenTeamScopes', {
            name: 'access_token_team_scope_unique',
            fields: ['AccessTokenId', 'TeamId'],
            unique: true
        })
        await context.addIndex('AccessTokenTeamScopes', {
            name: 'access_token_team_scope_user_team',
            fields: ['UserId', 'TeamId']
        })
    },
    down: async (context) => {}
}
