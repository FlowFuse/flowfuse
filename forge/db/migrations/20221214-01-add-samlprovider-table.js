/**
 * Add SAMLProviders table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('SAMLProviders', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: { type: DataTypes.STRING },
            domainFilter: { type: DataTypes.STRING, allowNull: false },
            active: { type: DataTypes.BOOLEAN, defaultValue: true },
            options: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE }
        })
    },
    down: async (context) => {
    }
}
