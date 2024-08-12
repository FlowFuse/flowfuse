/* eslint-disable no-unused-vars */
/**
 * Add none as valid action for a PiplineStage
 */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (queryInterface) => {
        if (queryInterface.sequelize.options.dialog === 'postgres') {
            // Postgres enums need to be explicitly updated
            queryInterface.sequelize.query("ALTER TYPE \"enum_PipelineStages_action\" ADD VALUE 'none';")
        }
    },
    down: async (context) => {
    }
}
