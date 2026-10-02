/**
 * Give every existing MCP OAuth token a grant matching its readOnly flag.
 * Only MCP OAuth tokens carry a refresh token expiry.
 */

const { QueryTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        const tokens = await context.sequelize.query(
            'SELECT "id", "readOnly" FROM "AccessTokens" WHERE "refreshTokenExpiresAt" IS NOT NULL',
            { type: QueryTypes.SELECT }
        )
        if (tokens.length === 0) {
            return
        }
        const now = new Date()
        const rows = tokens.map(token => {
            const categories = { read: true, write: !token.readOnly, destructive: false }
            return {
                AccessTokenId: token.id,
                permissions: JSON.stringify({ platform: { ...categories }, flow_building: { ...categories } }),
                createdAt: now,
                updatedAt: now
            }
        })
        await context.bulkInsert('MCPGrants', rows)
    },
    down: async (context) => {}
}
