/* eslint-disable no-unused-vars */

/*
 * Adds the topicPrefix column to the BrokerCredentials Table
 */
const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * Add topicPrefix field to BrokerCredentials table
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('BrokerCredentials', 'topicPrefix', {
            type: DataTypes.TEXT,
            defaultValue: '["#"]',
            allowNull: true
        })
    },
    down: async (context) => {}
}
