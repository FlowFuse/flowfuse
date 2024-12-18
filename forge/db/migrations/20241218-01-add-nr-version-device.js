/**
 * Add Node-RED version to Device table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('Devices', 'nodeRedVersion', {
            type: DataTypes.TEXT,
            defaultValue: null
        })
    },
    down: async (context) => {
    }
}
