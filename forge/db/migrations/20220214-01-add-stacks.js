/**
 * Add the ProjectStacks table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('ProjectStacks', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            active: { type: DataTypes.BOOLEAN, defaultValue: true },
            name: { type: DataTypes.STRING, allowNull: false, unique: true },
            properties: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE }
        })
        await context.addColumn('Projects', 'stackId', {
            type: DataTypes.INTEGER,
            references: { model: 'ProjectStacks', key: 'id' },
            onDelete: 'set null',
            onUpdate: 'cascade'
        })
        await context.removeColumn('Projects', 'type')
    },
    down: async (context) => {
    }
}
