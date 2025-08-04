/**
 * Fix Applications Teams reference
 */

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
                await context.sequelize.query('ALTER TABLE "Applications" DROP CONSTRAINT "Applications_TeamId_fkey";', { transaction })
                await context.sequelize.query('ALTER TABLE "Applications" ADD CONSTRAINT "Applications_TeamId_fkey" ' +
                    'FOREIGN KEY ("TeamId")' +
                    'REFERENCES "Teams"("id") ON UPDATE CASCADE ON DELETE CASCADE;', { transaction })

                await transaction.commit()
            } catch (err) {
                await transaction.rollback()
                throw err
            }
        }
    },
    down: async (context) => {}
}
