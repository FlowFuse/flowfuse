/* eslint-disable no-unused-vars */
/**
 * Add DeviceGroups table that has an FK association with Applications and Devices
 */

const { Sequelize, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context QueryInterface
     */
    up: async (context) => {
        // add a column activePipelineStageId to DeviceGroup table
        // This column is deliberately not a reference to PipelineStage table
        // it is set/updated by the application / controller upon deployment
        await context.addColumn('DeviceGroups', 'activePipelineStageId', {
            type: Sequelize.INTEGER,
            allowNull: true
        })
    },

    down: async (queryInterface, Sequelize) => {

    }
}
