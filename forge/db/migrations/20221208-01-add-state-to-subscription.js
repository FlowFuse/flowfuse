/**
 * Add status to subscriptions
 */

const { DataTypes } = require('sequelize')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up (queryInterface) {
        const tableExists = await queryInterface.tableExists('Subscriptions')
        if (!tableExists) {
            return queryInterface.sequelize.log('Skipping Subscription migration as table does not exist')
        }

        await queryInterface.addColumn('Subscriptions', 'status', {
            type: DataTypes.ENUM,
            values: ['active', 'canceled'], // Full list from stripe: trialing,active,incomplete,incomplete_expired,past_due,canceled,unpaid
            defaultValue: 'active'
        })
    },

    async down (queryInterface) {
        const tableExists = await queryInterface.tableExists('Subscriptions')
        if (!tableExists) {
            return queryInterface.sequelize.log('Skipping Subscription migration as table does not exist')
        }

        await queryInterface.removeColumn('Subscriptions', 'status')
    }
}
