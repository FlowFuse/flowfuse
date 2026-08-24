/* eslint-disable no-unused-vars */
/**
 * Add source column to AuditLogs table
 *
 * Tracks how an audited action was triggered:
 *   null  - legacy / cookie session (UI)
 *   'api' - PAT-authenticated direct API call
 *   'mcp:expert' - first-party expert agent via MCP
 *   'mcp' - third-party MCP agent (future)
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('AuditLogs', 'source', {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        })
    },
    down: async (context) => {
        await context.removeColumn('AuditLogs', 'source')
    }
}
