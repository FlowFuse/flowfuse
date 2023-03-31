/* eslint-disable no-unused-vars */
/**
 * Add past_due as valid state for a Subscription
 */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (queryInterface) => {
        const tableExists = await queryInterface.tableExists('Subscriptions')
        if (!tableExists) {
            return queryInterface.sequelize.log('Skipping Subscription migration as table does not exist')
        }

        if (queryInterface.sequelize.options.dialog === 'postgres') {
            // Postgres enums need to be explicitly updated
            queryInterface.sequelize.query("ALTER TYPE \"enum_Subscriptions_status\" ADD VALUE 'past_due';")
        }
    },
    down: async (context) => {
    }
}
