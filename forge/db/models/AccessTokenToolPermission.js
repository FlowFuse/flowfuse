/**
 * AccessTokenToolPermission
 * Per-team overrides of an MCP token's default tool permissions.
 */
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'AccessTokenToolPermission',
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
        { name: 'access_token_tool_permissions_unique', fields: ['AccessTokenId', 'TeamId', 'ApplicationId'], unique: true }
    ],
    associations: function (M) {
        this.belongsTo(M.AccessToken)
        this.belongsTo(M.Team)
        this.belongsTo(M.Application)
    }
}
