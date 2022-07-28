/**
 * Add replacedBy column to ProjectStacks table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('ProjectStacks', 'replacedBy', {
            type: DataTypes.INTEGER,
            references: { model: 'ProjectStacks', key: 'id' },
            onDelete: 'set null',
            onUpdate: 'cascade'
        })
    },
    down: async (context) => {
    }
}
