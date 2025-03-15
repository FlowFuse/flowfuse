/* eslint-disable no-unused-vars */
/**
 * Add index for AuditLogs entityType and entityId
 */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        const indexes = await context.showIndex('AuditLogs')
        // NOTE: this migration only adds the index if it doesn't already exist: This was done to
        // allow the platform admin to apply the index themselves upfront (if they want to).
        // For example, on a PG DB, the user may wish to pre-emptively create the index using the CONCURRENTLY
        // option to avoid locking the table for the duration of the index creation. e.g:
        //   CREATE INDEX CONCURRENTLY idx_auditlog_entity ON "AuditLogs" ("entityType", "entityId");
        // Time to build estimates for the index creation:
        // as the entityType is typically 10 bytes or less and the entityId is typically 36 bytes or less
        // the index key size is ~46 bytes. If the table has 1M rows, the index size will be ~46MB.
        // On a fast machine with SSD & reasonable memory, the index creation should take less than 1
        //  minute (typically 10-30 seconds)
        // If CONCURRENTLY is used, the table will not be locked during the index creation but will take longer
        if (indexes && Array.isArray(indexes)) {
            if (indexes.some(idx => idx.name === 'idx_auditlog_entity')) {
                return // index already exists
            }
        }
        await context.addIndex('AuditLogs', { name: 'idx_auditlog_entity', fields: ['entityType', 'entityId'], unique: false })
    },
    down: async (context) => {
    }
}
