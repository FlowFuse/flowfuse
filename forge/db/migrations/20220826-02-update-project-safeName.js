/* eslint-disable no-unused-vars */
/**
 * Update safeName column in Projects table
 */
const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.sequelize.query('UPDATE "Projects" SET "safeName" = LOWER("name") WHERE "safeName" IS NULL;')
        await context.addIndex('Projects', { name: 'projects_safe_name_unique', fields: ['safeName'], unique: true })
    },
    down: async (context) => {
    }
}
