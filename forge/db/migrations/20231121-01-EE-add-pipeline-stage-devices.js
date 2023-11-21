/**
 * Add the add though table for PipelineStage *..* Device
 * Sequelize can auto-create this, but manually adding gives control
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        try {
            const table = await context.describeTable('PipelineStages')
            if (!table.action) {
                throw new Error('The action column is missing on PipelineStages')
            }
        } catch (err) {
            // Missing table or column means EE only Pipeline stage migration has not run
            // Check to see if the tables need to be set up by calling the previous pipeline stage migration (which also checks)
            await require('./20230919-01-add-action-to-pipeline-stage.js').up(context)
        }

        await context.createTable('PipelineStageDevices', {
            DeviceId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'Devices', key: 'id' },
                onDelete: 'cascade',
                onUpdate: 'cascade'
            },
            PipelineStageId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'PipelineStages', key: 'id' },
                onDelete: 'cascade',
                onUpdate: 'cascade'
            }
        })
    },
    down: async (context) => {
    }
}
