/**
 * A refresh token rotated out of an MCP OAuth grant, retained as lineage so a
 * later presentation resolves to a grace-window retry or a replay to revoke.
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
        tokenHash: { type: DataTypes.STRING, allowNull: false },
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
