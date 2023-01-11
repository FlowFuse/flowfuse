/**
 * Add StorageSharedLibrary table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('StorageSharedLibraries', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: { type: DataTypes.TEXT, allowNull: false },
            type: { type: DataTypes.TEXT, allowNull: false },
            meta: { type: DataTypes.TEXT, allowNull: true },
            body: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
            TeamId: {
                type: DataTypes.INTEGER,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'cascade',
                onUpdate: 'cascade'
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
        })
    },
    down: async (context) => {
    }
}
