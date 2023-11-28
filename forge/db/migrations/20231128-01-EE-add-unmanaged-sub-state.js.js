/**
 * Add unmanaged as valid state for a Subscription
 */

module.exports = {
    up: async (queryInterface) => {
        const tableExists = await queryInterface.tableExists('Subscriptions')
        if (!tableExists) {
            return queryInterface.sequelize.log('Skipping Subscription migration as table does not exist')
        }

        if (queryInterface.sequelize.options.dialog === 'postgres') {
            // Postgres enums need to be explicitly updated
            queryInterface.sequelize.query("ALTER TYPE \"enum_Subscriptions_status\" ADD VALUE 'unmanaged';")
        }
    },
    down: async (context) => {
    }
}
