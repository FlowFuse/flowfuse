/**
 * Revert the starter teamType userLimit to 0
 */

module.exports = {
    up: async (context) => {
        const properties = await context.sequelize.query('select "properties" from "TeamTypes" where "name" = \'starter\'', { type: context.sequelize.QueryTypes.SELECT })
        if (properties.length > 0) {
            const starterProperties = JSON.parse(properties[0].properties)
            if (starterProperties.userLimit !== 0) {
                starterProperties.userLimit = 0
                await context.sequelize.query(`update "TeamTypes" set "properties" = '${JSON.stringify(starterProperties)}' where "name" = 'starter'`)
            }
        }
    },
    down: async (context) => {
    }
}
