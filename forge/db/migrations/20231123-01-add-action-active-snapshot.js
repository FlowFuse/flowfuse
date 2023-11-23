/* eslint-disable no-unused-vars */
/**
 * Add use_active_snapshot as valid action for a PiplineStage
 */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (queryInterface) => {
        const tableExists = await queryInterface.tableExists('PipelineStages')
        if (!tableExists) {
            return queryInterface.sequelize.log('Skipping PipelineStages migration as table does not exist')
        }

        if (queryInterface.sequelize.options.dialog === 'postgres') {
            // Postgres enums need to be explicitly updated
            queryInterface.sequelize.query("ALTER TYPE \"enum_PipelineStages_action\" ADD VALUE 'use_active_snapshot';")
        }
    },
    down: async (context) => {
    }
}
