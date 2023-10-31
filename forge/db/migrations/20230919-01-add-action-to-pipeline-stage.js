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
        try {
            await context.describeTable('PipelineStages')
        } catch (err) {
            // Missing table means this db was initialised after Pipelines
            // were introduced and does not have an EE license. So we need to
            // rerun the Pipeline migrations to ensure the tables exist in the
            // right state
            await require('./20230504-01-add-pipelines').up(context)
            await require('./20230705-01-add-device-setting-to-stages').up(context)
        }

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
