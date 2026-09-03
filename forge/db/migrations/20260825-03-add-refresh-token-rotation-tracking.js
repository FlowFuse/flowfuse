/**
 * Track the previously rotated-out refresh token so rotation can tell a
 * legitimate concurrent or retried refresh from a replay.
 *
 * On each MCP refresh the refresh token is rotated: a new one is issued and the
 * presented one is recorded here. Presenting the recorded token again within a
 * short grace window is treated as a retry and returns the current tokens;
 * presenting it after the window is a replay and revokes the grant.
 *
 *   previousRefreshToken          - sha256 of the last rotated-out refresh token.
 *   previousRefreshTokenRotatedAt - when that rotation happened, used to bound
 *                                   the grace window.
 *
 * Both are null for tokens that do not rotate (for example editor sessions).
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('AccessTokens', 'previousRefreshToken', {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        })
        await context.addColumn('AccessTokens', 'previousRefreshTokenRotatedAt', {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        })
    },
    down: async (context) => {
        await context.removeColumn('AccessTokens', 'previousRefreshToken')
        await context.removeColumn('AccessTokens', 'previousRefreshTokenRotatedAt')
    }
}
