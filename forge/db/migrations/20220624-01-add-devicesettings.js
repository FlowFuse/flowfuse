/**
 * Add DeviceSettings table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('Devices', 'settingsHash', {
            type: DataTypes.STRING,
            default: '',
            allowNull: true
        })
    },
    down: async (context) => {

    }
}
