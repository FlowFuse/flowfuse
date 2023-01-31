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

        const TRIAL_STATUS = {
            NONE: 'none',
            CREATED: 'created',
            WEEK_EMAIL_SENT: 'week_email_sent',
            DAY_EMAIL_SENT: 'day_email_sent',
            ENDED: 'ended'
        }

        await queryInterface.addColumn('Subscriptions', 'trialState', {
            type: DataTypes.ENUM(Object.values(TRIAL_STATUS)),
            defaultValue: TRIAL_STATUS.NONE,
            allowNull: true
        })
        if (queryInterface.sequelize.options.dialog === 'postgres') {
            // Postgres enums need to be explicitly updated
            queryInterface.sequelize.query("ALTER TYPE \"enum_Subscriptions_status\" ADD VALUE 'trial';")
        }
    },
    down: async (context) => {
    }
}
