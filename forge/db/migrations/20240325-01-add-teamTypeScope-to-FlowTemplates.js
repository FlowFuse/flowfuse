/* eslint-disable no-unused-vars */
/**
 * Add teamTypeScope column to FlowTemplates table
 */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('FlowTemplates', 'teamTypeScope', {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null
        })
    },
    down: async (context) => {
    }
}
