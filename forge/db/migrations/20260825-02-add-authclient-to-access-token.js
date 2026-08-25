/**
 * Link an AccessToken back to the AuthClient it was issued to.
 *
 * MCP OAuth tokens are minted for a dynamically-registered client (see
 * AuthClient.type = 'mcp'), but until now the AccessToken row kept no
 * reference to that client - only a copied-in `name`. Storing the client id
 * lets the token be traced back to its client after issuance, which future
 * audit attribution needs.
 *
 *   AuthClientId - the clientID of the AuthClient this token was issued to.
 *                   Null for tokens not tied to a client.
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('AccessTokens', 'AuthClientId', {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        })
    },
    down: async (context) => {
        await context.removeColumn('AccessTokens', 'AuthClientId')
    }
}
