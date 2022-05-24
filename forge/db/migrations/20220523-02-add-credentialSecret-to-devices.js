/**
 * Add credentialSecret to Devices table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('Devices', 'credentialSecret', {
            type: DataTypes.STRING
        })
    },
    down: async (context) => {
    }
}
