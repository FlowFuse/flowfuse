/**
 * Add settings to DeviceGroups table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('DeviceGroups', 'settings', {
            type: DataTypes.TEXT,
            defaultValue: null
        })
    },
    down: async (context) => {
    }
}
