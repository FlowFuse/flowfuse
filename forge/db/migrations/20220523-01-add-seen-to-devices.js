/**
 * Add lastSeenAt column to Devices table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('Devices', 'lastSeenAt', {
            type: DataTypes.DATE
        })
    },
    down: async (context) => {
    }
}
