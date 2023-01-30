/* eslint-disable no-unused-vars */
/**
 * Add trialEndsAt column to Subscription
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

        await queryInterface.addColumn('Subscriptions', 'trialEndsAt', {
            type: DataTypes.DATE,
            defaultValue: null,
            allowNull: true
        })

        if (queryInterface.sequelize.options.dialog === 'postgres') {
            // Postgres enums need to be explicitly updated
            queryInterface.sequelize.query("ALTER TYPE \"enum_Subscriptions_status\" ADD VALUE 'trial:init';")
            queryInterface.sequelize.query("ALTER TYPE \"enum_Subscriptions_status\" ADD VALUE 'trial:email_1_sent';")
            queryInterface.sequelize.query("ALTER TYPE \"enum_Subscriptions_status\" ADD VALUE 'trial:email_2_sent';")
            queryInterface.sequelize.query("ALTER TYPE \"enum_Subscriptions_status\" ADD VALUE 'trial:email_3_sent';")
        }
    },
    down: async (context) => {
    }
}
