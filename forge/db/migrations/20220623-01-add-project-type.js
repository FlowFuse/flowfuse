/**
 * Add the ProjectStacks table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('ProjectTypes', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: { type: DataTypes.STRING, allowNull: false, unique: true },
            active: { type: DataTypes.BOOLEAN, defaultValue: true },
            order: { type: DataTypes.INTEGER, defaultValue: 0 },
            description: { type: DataTypes.TEXT },
            properties: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
            defaultStackId: {
                type: DataTypes.INTEGER,
                references: { model: 'ProjectStacks', key: 'id' },
                onDelete: 'set null',
                onUpdate: 'cascade'
            }
        })
        await context.addColumn('Projects', 'ProjectTypeId', {
            type: DataTypes.INTEGER,
            references: { model: 'ProjectTypes', key: 'id' },
            onDelete: 'set null',
            onUpdate: 'cascade'
        })
        await context.addColumn('ProjectStacks', 'ProjectTypeId', {
            type: DataTypes.INTEGER,
            references: { model: 'ProjectTypes', key: 'id' },
            onDelete: 'set null',
            onUpdate: 'cascade'
        })
    },
    down: async (context) => {
    }
}
