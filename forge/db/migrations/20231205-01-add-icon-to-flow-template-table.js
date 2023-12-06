/* eslint-disable no-unused-vars */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * Add icon to FlowTemplate (renamed FlowBlueprints in the UI)
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('FlowTemplates', 'icon', {
            type: DataTypes.STRING,
            allowNull: true
        })
    },
    down: async (context) => {
    }
}
