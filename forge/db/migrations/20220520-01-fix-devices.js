/**
 * Add Device table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('Devices', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: { type: DataTypes.STRING, allowNull: false },
            type: { type: DataTypes.STRING, allowNull: false },
            state: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
            TeamId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            ProjectId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: { model: 'Projects', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })
    },
    down: async (context) => {
    }
}
