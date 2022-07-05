/**
 * Add DeviceSettings table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.createTable('DeviceSettings', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            DeviceId: {
                type: DataTypes.INTEGER,
                unique: 'pk_settings',
                allowNull: true,
                references: { model: 'Devices', key: 'id' },
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
                    fields: ['DeviceId', 'key']
                }
            }
        })
        await context.addColumn('Devices', 'settingsHash', {
            type: DataTypes.STRING,
            default: '',
            allowNull: true
        })
    },
    down: async (context) => {

    }
}
