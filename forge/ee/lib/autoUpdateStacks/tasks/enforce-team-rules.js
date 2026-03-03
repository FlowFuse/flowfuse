/**
 * If a Team changes TeamType apply new AutoUpdate rules
 */
const { KEY_STACK_UPGRADE_HOUR } = require('../../../../db/models/ProjectSettings')
const { randomInt } = require('../../../../housekeeper/utils')

module.exports = {
    name: 'fixTeamStackUpdateRules',
    startup: false,
    schedule: `${randomInt(0, 29)} ${randomInt(0, 23)} * * *`, // random time every day
    run: async function (app) {
        if (app.config.features.enabled('autoStackUpdate')) {
            app.log.info('Running AutoStackUpgrade Teams Tests')
            const teamTypes = await app.db.models.TeamType.getAll({}, { active: true })
            for (const teamType of teamTypes.types) {
                if (teamType) {
                    const typeProperties = teamType.properties
                    if (typeProperties.autoStackUpdate?.allowDisable === false) {
                        app.log.info(`Found TeamType ${teamType.name} needs to enforce AutoStackUpdate`)
                        const autoStackUpdate = teamType.getProperty('autoStackUpdate')
                        // this TeamType needs to enforce restart rules.
                        // get all teams with this type, then get all instances in those teams
                        const teams = await app.db.models.Team.findAll({
                            where: {
                                TeamTypeId: teamType.id
                            }
                        })
                        for (const team of teams) {
                            if (team) {
                                const instances = await app.db.models.Project.byTeam(team.id)
                                for (const instance of instances) {
                                    if (instance) {
                                        let found = false
                                        for (let day = 0; day++; day < 7) {
                                            const k = instance.getSetting(`${KEY_STACK_UPGRADE_HOUR}_${day}`)
                                            if (k) {
                                                found = true
                                                break
                                            }
                                        }

                                        if (!found) {
                                            const days = autoStackUpdate.days
                                            const hours = autoStackUpdate.hours
                                            // generate random day and hour in ranges
                                            const day = days[Math.floor(days.length * Math.random())]
                                            const hour = hours[Math.floor(hours.length * Math.random())]
                                            await instance.updateSetting(`${KEY_STACK_UPGRADE_HOUR}_${day}`, { hour })
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
