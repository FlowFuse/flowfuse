/**
 * Add UserBillingCode table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('UserBillingCodes', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            code: { type: DataTypes.STRING },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
            UserId: {
                type: DataTypes.INTEGER,
                references: { model: 'Users', key: 'id' },
                onDelete: 'cascade',
                onUpdate: 'cascade'
            }
        })
    },
    down: async (context) => {
    }
}
