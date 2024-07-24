/**
 * Add Notifications table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.createTable('Notifications', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            type: { type: DataTypes.STRING, allowNull: false },
            reference: { type: DataTypes.STRING, allowNull: true },
            read: { type: DataTypes.BOOLEAN, defaultValue: false },
            data: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            UserId: {
                type: DataTypes.INTEGER,
                references: { model: 'Users', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }
        })
    },
    down: async (context) => {
    }
}
