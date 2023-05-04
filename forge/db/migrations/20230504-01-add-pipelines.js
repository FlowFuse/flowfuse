/**
 * Add the ProjectStacks table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('Projects', 'PipelineStageId', {
            type: DataTypes.INTEGER,
            references: { model: 'PipelineStages', key: 'id' },
            onDelete: 'set null',
            onUpdate: 'cascade'
        })
    },
    down: async (context) => {
    }
}
