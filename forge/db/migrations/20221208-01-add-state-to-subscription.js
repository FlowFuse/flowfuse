/**
 * Add status to subscriptions
 */

const { DataTypes } = require('sequelize')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up (queryInterface, Sequelize) {
        await queryInterface.addColumn('Subscriptions', 'status', {
            type: DataTypes.ENUM,
            values: ['active', 'canceled'], // Full list from stripe: trialing,active,incomplete,incomplete_expired,past_due,canceled,unpaid
            defaultValue: 'active'
        })
    },

    async down (queryInterface, Sequelize) {
        await queryInterface.removeColumn('Subscriptions', 'status')
    }
}
