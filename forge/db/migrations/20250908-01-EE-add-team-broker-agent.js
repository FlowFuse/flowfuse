/**
 * Add TeamBrokerAgents table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('TeamBrokerAgents', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            settings: { type: DataTypes.TEXT, allowNull: true },
            auth: { type: DataTypes.STRING, allowNull: false },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            TeamId: {
                type: DataTypes.INTEGER,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }
        })
    },
    down: async (context) => {}
}