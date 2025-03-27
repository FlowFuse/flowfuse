/* eslint-disable no-unused-vars */

/*
 * Update the JSON string in `ProjectTemplates`.`settings` so that emailAlerts.resource.cpu and emailAlerts.resource.memory are set to true
 */
const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        // The `type` option is explicitly set to `context.sequelize.QueryTypes.SELECT` to ensure that the query is executed as a SELECT statement.
        // This ensures the results are always returned as an array of objects.
        const results = await context.sequelize.query('SELECT "id", "settings", "policy" FROM "ProjectTemplates" WHERE "settings" IS NOT NULL', { type: context.sequelize.QueryTypes.SELECT })
        for (const result of results) {
            if (result.settings) {
                try {
                    const settings = JSON.parse(result.settings)
                    const policy = JSON.parse(result.policy || '{}')
                    settings.emailAlerts = settings.emailAlerts || {}
                    settings.emailAlerts.resource = settings.emailAlerts.resource || {}
                    const cpuBefore = settings.emailAlerts.resource.cpu
                    const memoryBefore = settings.emailAlerts.resource.memory
                    // if the policy has been set to false by the platform admin, don't modify its setting
                    if (policy?.emailAlerts?.resource?.cpu !== false) {
                        settings.emailAlerts.resource.cpu = true
                    }
                    if (policy?.emailAlerts?.resource?.memory !== false) {
                        settings.emailAlerts.resource.memory = true
                    }
                    if (cpuBefore === settings.emailAlerts.resource.cpu && memoryBefore === settings.emailAlerts.resource.memory) {
                        continue
                    }
                    const q = `UPDATE "ProjectTemplates" SET "settings" = ? WHERE "id" = ${result.id}`
                    const replacements = [JSON.stringify(settings)]
                    await context.sequelize.query(q, { replacements })
                } catch (error) {
                    continue
                }
            }
        }
    },
    down: async (context) => {
    }
}
