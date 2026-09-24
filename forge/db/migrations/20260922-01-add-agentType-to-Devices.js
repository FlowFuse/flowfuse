/**
 * Add `agentType` column to the `Devices` table to record the type of agent running on the device.
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('Devices', 'agentType', {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        })
    },
    down: async (context) => {}
}
