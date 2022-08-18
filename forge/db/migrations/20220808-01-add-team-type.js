/**
 * Add defaultTeam to Users table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('TeamTypes', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            },
            enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
            description: { type: DataTypes.TEXT },
            properties: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
        })
        await context.addColumn('Teams', 'TeamTypeId', {
            type: DataTypes.INTEGER,
            references: { model: 'TeamTypes', key: 'id' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        })
    },
    down: async (context) => {
    }
}
