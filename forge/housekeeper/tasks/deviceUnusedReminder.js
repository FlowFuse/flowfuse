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
        // the "team owner(s)" about the device(s) that are ~24h old and ~5 days old since creation

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

        // The goal is to remind users about unused devices at 24h and around 5 days
        // Since this schedule only runs every 24h between 7 and 8 am UTC, we need to
        // make some choices as to what to include and when.
        // To find a reasonable balance, we will create two filters:
        // 1. window 1 - between 42h and 18h ago
        // 2. window 2 - between 5.5d and 4.5d ago
        // Any device that was created within these timeframes will be included

        const now = Date.now()
        const window1a = new Date(now - 42 * 60 * 60 * 1000) // set to 42 hours ago
        const window1b = new Date(now - 18 * 60 * 60 * 1000) // set to 18 hours ago
        const window2a = new Date(now - 5.5 * 24 * 60 * 60 * 1000) // set to 5.5 days ago
        const window2b = new Date(now - 4.5 * 24 * 60 * 60 * 1000) // set to 4.5 days ago

        const filter1 = (device) => device.createdAt >= window1a && device.createdAt <= window1b
        const filter2 = (device) => device.createdAt >= window2a && device.createdAt <= window2b

        const devicesInWindow1 = unusedDevices.filter(filter1)
        const devicesInWindow2 = unusedDevices.filter(filter2)

        const recentUnusedDevices = [...devicesInWindow1, ...devicesInWindow2]
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
