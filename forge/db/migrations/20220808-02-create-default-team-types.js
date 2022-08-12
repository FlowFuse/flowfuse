/**
 * Add default TeamTypes to table and ensure all teams are set to starter type.
 *
 * This migration is also called whenever FlowForge starts in order to insert
 * the default set of TeamTypes. It only applies them if there are no types found
 * in the table.
 */

module.exports = {
    up: async (context) => {
        const count = await context.sequelize.query('select count(id) as count from "TeamTypes"', { type: context.sequelize.QueryTypes.SELECT })
        if (parseInt(count[0].count) === 0) {
            await context.bulkInsert('TeamTypes', [
                {
                    name: 'starter',
                    enabled: true,
                    description: 'Collaborate on projects with a starter team',
                    properties: JSON.stringify({
                        userLimit: 0
                    }),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ])
            const starterType = await context.sequelize.query('select id from "TeamTypes" where "name" = \'starter\'', { type: context.sequelize.QueryTypes.SELECT })
            const starterTypeId = starterType[0].id

            await context.sequelize.query(`update "Teams" set "TeamTypeId" = ${starterTypeId} where "TeamTypeId" is null`)
        }
    },
    down: async (context) => {
    }
}
