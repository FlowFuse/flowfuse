/* eslint-disable no-unused-vars */

/*
 * Adds the topicPrefix column to the BrokerCredentials Table
 */
const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('BrokerCredentials', 'topicPrefix', {
            type: DataTypes.STRING,
            defaultValue: '#',
            allowNull: true
        })
    },
    down: async (context) => {}
}
