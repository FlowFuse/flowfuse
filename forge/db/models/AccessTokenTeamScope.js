/**
 * AccessTokenTeamScope join table
 * Links scoped PATs to the teams they are allowed to access.
 */
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'AccessTokenTeamScope',
    schema: {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        }
    },
    meta: {
        slug: false,
        hashid: false,
        links: false
    },
    indexes: [
        { name: 'access_token_team_scope_unique', fields: ['AccessTokenId', 'TeamId'], unique: true },
        { name: 'access_token_team_scope_user_team', fields: ['UserId', 'TeamId'] }
    ],
    associations: function (M) {
        this.belongsTo(M.AccessToken)
        this.belongsTo(M.Team)
        this.belongsTo(M.User)
    }
}
