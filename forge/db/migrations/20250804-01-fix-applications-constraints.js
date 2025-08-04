/**
 * Fix Applications Teams reference
 */
const { DataTypes } = require('sequelize')
const { down } = require('./20230224-01-create-application-table')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context, Sequelize) => {
        // if Postgres
        if (context.sequelize.getDialect() === 'postgres') {
            const transaction = await context.sequelize.transaction()
            try {

                context.sequelize.query('ALTER TABLE "Applications" DROP CONSTRAINT "Applications_TeamId_fkey;"', { transaction })
                context.sequelize.query('ALTER TABLE "Applications"ADD CONSTRAINT "Applications_TeamId_fkey" ' +
                    'FOREIGN KEY ("TeamId")' +
                    'REFERENCES "Teams"("id") ON UPDATE CASCADE ON DELETE CASCADE;', { transaction })

                await transaction.commit()
            } catch (err) {
                await transaction.rollback()
            }
        }
    },
    down: async (context) => {}
}