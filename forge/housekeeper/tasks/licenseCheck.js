const { Op } = require('sequelize')

module.exports = {
    name: 'licenseCheck',
    startup: false,
    schedule: '50 23 * * *', // cron syntax for every day at 23:50
    run: async function (app) {
        const { expired, expiring, grace, daysRemaining, graceDaysRemaining } = app.license.status

        // check license status: warn admins if expiring soon
        if (expiring && !this._expiring_sent) {
            await emailAdmins(app, 'LicenseReminder', { days: daysRemaining })
            this._expiring_sent = true
        }
        if (grace && !this._grace_sent) {
            await emailAdmins(app, 'LicenseGrace', { days: graceDaysRemaining })
            this._grace_sent = true
        }
        if (expired) {
            await suspendAllProjects(app) // stop projects when license expires (if configured)
            if (!this._expired_sent) {
                await emailAdmins(app, 'LicenseExpired', {})
                this._expired_sent = true
            }
        }
    }
}

async function emailAdmins (app, template, context) {
    const admins = await app.db.models.User.admins()
    for (const admin of admins) {
        await app.postoffice.send(admin, template, context)
    }
}

async function suspendAllProjects (app) {
    const STOP_ON_EXPIRY = app.config.license_expiry_stops_all || false
    if (STOP_ON_EXPIRY) {
        // get a list of all projects where state is not 'suspended' or 'suspending'
        const projects = await app.db.models.Project.findAll({
            where: {
                state: {
                    [Op.notIn]: ['suspended', 'suspending']
                }
            }
        })
        if (projects.length === 0) {
            return Promise.resolve()
        }
        // stop all projects
        await Promise.all(projects.map(project => suspendProject(app, project)))
    }
    return Promise.resolve()
}

async function suspendProject (app, project) {
    try {
        app.db.controllers.Project.setInflightState(project, 'suspending')
        await app.containers.stop(project)
        app.db.controllers.Project.clearInflightState(project)
        await app.auditLog.Project.project.suspended(0, null, project)
    } catch (error) {
        app.db.controllers.Project.clearInflightState(project)
        app.log.error(error)
    }
}
