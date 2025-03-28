/* eslint-disable no-unused-vars */

/*
 * Adds the topicPrefix column to the BrokerCredentials Table
 */
const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('BrokerCredentials', 'topicPrefix', {
            type: DataTypes.STRING,
            defaultValue: '["#"]',
            allowNull: true,
            get () {
                const rawValue = this.getDataValue('topicPrefix')
                if (rawValue) {
                    return JSON.parse(rawValue)
                } else {
                    return ['#']
                }
            },
            set (value) {
                if (value) {
                    this.setDataValue(this.topicPrefix, JSON.stringify(value))
                }
            }
        })
    },
    down: async (context) => {}
}
