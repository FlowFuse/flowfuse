/* eslint-disable no-unused-vars */
/**
 * Add suspended column to Users
 */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('Users', 'suspended', {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        })
    },
    down: async (context) => {
    }
}
