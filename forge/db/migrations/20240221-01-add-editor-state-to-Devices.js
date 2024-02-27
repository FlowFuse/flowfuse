/* eslint-disable no-unused-vars */

/**
 * Add editorAffinity details to Devices table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('Devices', 'editorAffinity', {
            type: DataTypes.STRING,
            defaultValue: ''
        })
        await context.addColumn('Devices', 'editorToken', {
            type: DataTypes.STRING,
            defaultValue: ''
        })
        await context.addColumn('Devices', 'editorConnected', {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        })
    },
    down: async (context) => {
    }
}
