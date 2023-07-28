/**
 * Adds a column to track whether devices should be deployed to to pipeline stages
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
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
