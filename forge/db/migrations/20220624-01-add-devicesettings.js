/**
 * Add DeviceSettings table
 */
const { DataTypes } = require('sequelize')

const SettingTypes = {
    STRING: 0,
    JSON: 1
}

module.exports = {
    up: async (context) => {
        await context.createTable('DeviceSettings', {
            DeviceId: { type: DataTypes.INTEGER, unique: 'pk_settings' },
            key: { type: DataTypes.STRING, allowNull: false, unique: 'pk_settings' },
            value: {
                type: DataTypes.TEXT,
                get () {
                    const rawValue = this.getDataValue('value')
                    const valueType = this.getDataValue('valueType')
                    if (rawValue === undefined || rawValue === null || valueType === 0) {
                        return rawValue
                    }
                    return JSON.parse(rawValue)
                },
                set (value) {
                    if (typeof value === 'string' || value === null || value === undefined) {
                        this.setDataValue('value', value)
                        this.setDataValue('valueType', SettingTypes.STRING)
                        return
                    }
                    this.setDataValue('value', JSON.stringify(value))
                    this.setDataValue('valueType', SettingTypes.JSON)
                }
            },
            valueType: { type: DataTypes.INTEGER, allowNull: false }
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
