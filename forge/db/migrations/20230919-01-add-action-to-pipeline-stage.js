/* eslint-disable no-unused-vars */

/**
 * Add ProjectSnapshots table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        const SNAPSHOT_ACTIONS = {
            CREATE_SNAPSHOT: 'create_snapshot',
            USE_LATEST_SNAPSHOT: 'use_latest_snapshot',
            PROMPT: 'prompt'
        }

        await context.addColumn('PipelineStages', 'action', {
            type: DataTypes.ENUM(Object.values(SNAPSHOT_ACTIONS)),
            defaultValue: SNAPSHOT_ACTIONS.CREATE_SNAPSHOT,
            allowNull: false
        })
    },
    down: async (context) => {
    }
}
