/**
 * Record the user-chosen end date of an MCP OAuth grant.
 *
 * The consent screen lets the user pick when the grant expires (at most one
 * year out). The refresh window (refreshTokenExpiresAt) slides forward on
 * every refresh, so it cannot hold that choice: grantExpiresAt stores it
 * permanently and refreshing is capped so the grant never outlives it.
 *
 *   grantExpiresAt - the consent-chosen end of the grant. Null for tokens
 *                    that do not carry one, which keep the previous behaviour.
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('AccessTokens', 'grantExpiresAt', {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        })
    },
    down: async (context) => {}
}
