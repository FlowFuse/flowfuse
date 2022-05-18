/**
 * Add ProjectSnapshots table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('ProjectSnapshots', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: { type: DataTypes.STRING, allowNull: false },
            settings: { type: DataTypes.TEXT },
            flows: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
            ProjectId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: { model: 'Projects', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            UserId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'Users', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })
    },
    down: async (context) => {
    }
}
