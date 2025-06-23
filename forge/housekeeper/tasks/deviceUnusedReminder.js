const { Op, literal } = require('sequelize')

const { Roles } = require('../../lib/roles')
const { sanitizeText } = require('../../postoffice/utils')
const { randomInt } = require('../utils')

module.exports = {
    name: 'deviceUnusedReminder',
    startup: false,
    // runs every 24h between 7 and 8 am UTC
    schedule: `${randomInt(0, 59)} 7 * * *`,
    run: async function (app) {
        // If a team has 1 or more devices but none of them have ever been online, then email
        // the "team owner(s)" about the device(s) that are younger than 2 weeks old since creation

        const unusedDevices = await app.db.models.Device.findAll({
            where: {
                lastSeenAt: null,
                TeamId: {
                    [Op.in]: literal('(SELECT "TeamId" FROM "Devices" GROUP BY "TeamId" HAVING COUNT(*) = SUM(CASE WHEN "lastSeenAt" IS NULL THEN 1 ELSE 0 END))')
                }
            },
            include: {
                model: app.db.models.Team,
                as: 'Team',
                // only fields we need are name and id
                attributes: ['id', 'name'],
                where: {
                    suspended: false
                }
            }
        })

        const fourteenDaysAgo = new Date()
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
        fourteenDaysAgo.setHours(0, 0, 0, 0)
        const recentUnusedDevices = unusedDevices.filter(device => {
            return device.createdAt >= fourteenDaysAgo
        })
        if (recentUnusedDevices.length === 0) {
            return // No unused devices found
        }
        const uniqueTeams = new Map()
        for (const device of recentUnusedDevices) {
            if (!uniqueTeams.has(device.TeamId)) {
                uniqueTeams.set(device.TeamId, device.Team)
            }
        }
        // filter out any teams that are expired
        if (app.license.active() && app.billing) {
            for (const [teamId, team] of uniqueTeams) {
                const subscription = await team.getSubscription()
                if (subscription && subscription.trialStatus === app.db.models.Subscription.TRIAL_STATUS.ENDED) {
                    uniqueTeams.delete(teamId)
                }
            }
        }
        if (uniqueTeams.size === 0) {
            return // No teams found
        }

        const uniqueTeamIds = Array.from(uniqueTeams.keys())

        const userFilter = {
            TeamId: {
                [Op.in]: uniqueTeamIds
            },
            role: Roles.Owner
        }
        const users = (await app.db.models.TeamMember.findAll({ where: userFilter, include: app.db.models.User }))

        for (const device of recentUnusedDevices) {
            const deviceTeamOwners = users.filter(user => user.TeamId === device.TeamId).map(user => user.User).filter(user => !user.suspended)
            if (!deviceTeamOwners || deviceTeamOwners.length === 0) {
                app.log.warn(`No active team owners found for device ${device.hashid} (${device.name}) in team ${device.Team.hashid} (${device.Team.name})`)
                continue // should not happen
            }
            for (const user of deviceTeamOwners) {
                if (device.Team) {
                    app.postoffice.send(user, 'DeviceUnusedReminder', {
                        deviceName: sanitizeText(device.name),
                        createdOn: device.createdAt.toDateString(),
                        teamName: device.Team?.name || 'Unnamed Team',
                        url: `${app.config.base_url}/device/${device.hashid}`,
                        reminderSentAt: new Date()
                    })
                }
            }
        }
    }
}
