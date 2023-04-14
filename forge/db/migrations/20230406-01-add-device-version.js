/**
 * Add agentVersion to a Device
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('Devices', 'agentVersion', {
            type: DataTypes.STRING,
            allowNull: true
        })
    },
    down: async (context) => {
    }
}
