/**
 * Add fields to AuthClients so MCP agents can register dynamically (RFC 7591).
 *
 * Existing clients (project/device editor auth) are owned by a resource via
 * ownerType/ownerId and authenticate with a clientSecret. MCP clients have no
 * owner and are public (PKCE, no secret), so they need somewhere to record the
 * client type, a display name, and the redirect URIs approved at registration.
 *
 *   type          - 'mcp' for dynamically registered MCP clients, null otherwise
 *   name          - the client_name supplied at registration
 *   redirectURIs  - JSON array of redirect URIs the client may use
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('AuthClients', 'type', {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        })
        await context.addColumn('AuthClients', 'name', {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        })
        await context.addColumn('AuthClients', 'redirectURIs', {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null
        })
    },
    down: async (context) => {
        await context.removeColumn('AuthClients', 'type')
        await context.removeColumn('AuthClients', 'name')
        await context.removeColumn('AuthClients', 'redirectURIs')
    }
}
