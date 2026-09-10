/**
 * Track rotated-out MCP refresh tokens so a later presentation can be resolved as a
 * grace-window retry or a replay.
 */

const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.createTable('AccessTokenRefreshRotations', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            tokenHash: {
                type: DataTypes.STRING,
                allowNull: false
            },
            rotatedAt: {
                type: DataTypes.DATE,
                allowNull: false
            },
            AccessTokenId: {
                type: DataTypes.INTEGER,
                references: { model: 'AccessTokens', key: 'id' },
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

        await context.addIndex('AccessTokenRefreshRotations', {
            name: 'access_token_refresh_rotation_hash',
            fields: ['tokenHash'],
            unique: true
        })
    },
    down: async (context) => {
        await context.dropTable('AccessTokenRefreshRotations')
    }
}
