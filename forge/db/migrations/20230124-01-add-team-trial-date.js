/* eslint-disable no-unused-vars */
/**
 * Add trialEndsAt column to Teams
 */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.addColumn('Teams', 'trialEndsAt', {
            type: DataTypes.DATE,
            defaultValue: null,
            allowNull: true
        })
    },
    down: async (context) => {
    }
}
