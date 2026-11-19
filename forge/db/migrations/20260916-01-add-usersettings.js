/**
 * Add UserSettings table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('UserSettings', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            UserId: {
                type: DataTypes.INTEGER,
                unique: 'pk_settings',
                allowNull: false,
                references: { model: 'Users', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            key: { type: DataTypes.STRING, allowNull: false, unique: 'pk_settings' },
            value: { type: DataTypes.TEXT },
            valueType: { type: DataTypes.INTEGER, allowNull: false },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false }
        }, {
            uniqueKeys: {
                pk_settings: {
                    fields: ['UserId', 'key']
                }
            }
        })
    },
    down: async (context) => {

    }
}
