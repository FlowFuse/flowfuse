/**
 * Track rotated-out MCP refresh tokens so rotation can tell a legitimate concurrent
 * or retried refresh from a replay.
 *
 * Each MCP refresh rotates the refresh token: a new one is issued and the presented
 * one is retired into this table with the moment it was retired. Presenting a retired
 * token within a short grace window is a retry or a lagging concurrent refresh;
 * presenting it after the window is a replay and revokes the grant. Keeping the full
 * lineage (not only the immediately previous token) means a token retired several
 * rotations ago is still recognised as belonging to the grant. The hash is unique and
 * indexed, so resolving a presented token never scans the AccessTokens table.
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
