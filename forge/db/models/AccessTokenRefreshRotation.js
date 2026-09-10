/**
 * AccessTokenRefreshRotation
 *
 * One row per refresh token that has been rotated out of an MCP OAuth grant.
 * Rotation retires the presented refresh token and records its hash here with the
 * moment it was retired. On the next refresh the controller resolves a non-current
 * token through this table: within the grace window it is a retry or a lagging
 * concurrent refresh; after the window it is a replay and the whole grant is revoked.
 *
 * Keeping the full lineage (not just the immediately previous token) means a token
 * retired several rotations ago is still recognised as belonging to the grant, so an
 * attacker who refreshes twice cannot bury the victim's stolen-then-retired token.
 * The hash is unique and indexed, so the lookup never scans the AccessTokens table.
 */
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'AccessTokenRefreshRotation',
    schema: {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        // sha256 of the retired refresh token, set directly (already hashed).
        tokenHash: { type: DataTypes.STRING, allowNull: false },
        // When this token was rotated out, used to bound the grace window.
        rotatedAt: { type: DataTypes.DATE, allowNull: false }
    },
    meta: {
        slug: false,
        hashid: false,
        links: false
    },
    indexes: [
        { name: 'access_token_refresh_rotation_hash', fields: ['tokenHash'], unique: true }
    ],
    associations: function (M) {
        this.belongsTo(M.AccessToken)
    }
}
