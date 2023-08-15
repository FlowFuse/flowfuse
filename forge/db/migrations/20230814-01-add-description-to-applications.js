/* eslint-disable no-unused-vars */
/**
 * Add description column to Applications table
 */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('Applications', 'description', {
            type: DataTypes.STRING,
            defaultValue: ''
        })
    },
    down: async (context) => {
    }
}
