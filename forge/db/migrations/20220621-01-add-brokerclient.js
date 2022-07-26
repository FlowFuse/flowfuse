/**
 * Add BrokerClients table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('BrokerClients', {
            username: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
            password: { type: DataTypes.STRING, allowNull: false },
            ownerId: { type: DataTypes.STRING },
            ownerType: { type: DataTypes.STRING },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE }
        })
    },
    down: async (context) => {
    }
}
