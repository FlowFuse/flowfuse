/**
 * Adds a column to track whether devices should be deployed to to pipeline stages
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        try {
            await context.describeTable('PipelineStages')
        } catch (err) {
            // Missing table means this db was initialised after Pipelines
            // were introduced and does not have an EE license. So we need to
            // rerun the Pipeline migrations to ensure the tables exist in the
            // right state
            await require('./20230504-01-add-pipelines').up(context)
        }
        await context.addColumn('PipelineStages', 'deployToDevices', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        })
    },
    down: async (context) => {
        await context.removeColumn('PipelineStages', 'deployToDevices')
    }
}
