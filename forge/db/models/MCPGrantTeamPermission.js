/**
 * MCPGrantTeamPermission
 * Per-team override of an MCP grant's default tool permissions.
 */
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'MCPGrantTeamPermission',
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
        { name: 'mcp_grant_team_permissions_unique', fields: ['MCPGrantId', 'TeamId'], unique: true }
    ],
    associations: function (M) {
        this.belongsTo(M.MCPGrant, { onDelete: 'CASCADE' })
        this.belongsTo(M.Team, { onDelete: 'CASCADE' })
    }
}
