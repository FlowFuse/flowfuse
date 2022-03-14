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
            // templateId: { type: DataTypes.INTEGER, allowNull: true },
            // revision: { type: DataTypes.INTEGER, allowNull: false },
            name: { type: DataTypes.STRING, unique: true },
            active: { type: DataTypes.BOOLEAN, defaultValue: true },
            description: { type: DataTypes.TEXT },
            settings: { type: DataTypes.TEXT },
            policy: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
            ownerId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: { model: 'Users', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
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
