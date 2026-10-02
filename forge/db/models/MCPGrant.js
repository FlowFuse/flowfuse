/**
 * MCPGrant
 * The tool permissions a user consented to for an MCP OAuth token.
 * The token is the ceiling, the grant narrows it.
 */
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'MCPGrant',
    schema: {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        permissions: {
            type: DataTypes.TEXT,
            allowNull: false,
            get () {
                const rawValue = this.getDataValue('permissions')
                return rawValue ? JSON.parse(rawValue) : null
            },
            set (value) {
                this.setDataValue('permissions', JSON.stringify(value))
            }
        }
    },
    meta: {
        slug: false,
        hashid: false,
        links: false
    },
    indexes: [
        { name: 'mcp_grants_access_token_unique', fields: ['AccessTokenId'], unique: true }
    ],
    associations: function (M) {
        this.belongsTo(M.AccessToken, { onDelete: 'CASCADE' })
        this.hasMany(M.MCPGrantTeamPermission, { onDelete: 'CASCADE' })
    }
}
