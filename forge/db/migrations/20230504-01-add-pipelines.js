/**
 * Add the ProjectStacks table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('Pipelines', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: { type: DataTypes.STRING, allowNull: false },

            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },

            ApplicationId: {
                type: DataTypes.INTEGER,
                references: { model: 'Applications', key: 'id' },
                onDelete: 'cascade',
                onUpdate: 'cascade'
            }
        })

        await context.createTable('PipelineStages', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: { type: DataTypes.STRING, allowNull: false },

            NextStageId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: { model: 'PipelineStages', key: 'id' },
                onDelete: 'SET NULL ',
                onUpdate: 'SET NULL '
            },

            PipelineId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'Pipelines', key: 'id' },
                onDelete: 'cascade',
                onUpdate: 'cascade'
            },

            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE }
        })

        await context.createTable('PipelineStageInstances', {
            InstanceId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: { model: 'Projects', key: 'id' },
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
