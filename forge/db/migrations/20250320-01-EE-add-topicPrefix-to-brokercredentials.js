/* eslint-disable no-unused-vars */

/*
 *
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