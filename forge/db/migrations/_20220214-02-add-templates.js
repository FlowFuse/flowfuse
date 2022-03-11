/**
 * Add the ProjectTemplates
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('ProjectTemplates', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: { type: DataTypes.STRING, unique: true },
            settings: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
            ParentId: {
                type: DataTypes.INTEGER,
                references: { model: 'ProjectTemplates', key: 'id' },
                onDelete: 'set null',
                onUpdate: 'cascade'
            }
        })
        await context.addColumn('Projects', 'ProjectTemplateId', {
            type: DataTypes.INTEGER,
            references: { model: 'ProjectTemplates', key: 'id' },
            onDelete: 'set null',
            onUpdate: 'cascade'
        })
    },
    down: async (context) => {
    }
}
