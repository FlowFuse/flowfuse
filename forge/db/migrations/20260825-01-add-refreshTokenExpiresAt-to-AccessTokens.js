/**
 * Give refresh tokens a lifetime independent of the access token.
 *
 * An AccessToken row holds both the access token and its refresh token. The
 * access token is short-lived (expiresAt); the refresh token is meant to
 * outlive it so a client can obtain a new access token after expiry
 * (RFC 6749 §1.5). Without a separate expiry the refresh token's lifetime was
 * tied to the access token's, so expiring the access token also discarded the
 * refresh token and made refresh impossible.
 *
 *   refreshTokenExpiresAt - when the refresh token itself expires. Null for
 *                           tokens that do not use a refresh lifetime, which
 *                           keep the previous behaviour.
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('AccessTokens', 'refreshTokenExpiresAt', {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        })
    },
    down: async (context) => {
        await context.removeColumn('AccessTokens', 'refreshTokenExpiresAt')
    }
}
