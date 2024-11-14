const { Op } = require('sequelize')
module.exports = {
    name: 'licenseCheck',
    startup: false,
    schedule: '0 2 * * *', // every day at 2am
    run: async function (app) {
        const { expired, expiring, daysRemaining, expiresAt, PRE_EXPIRE_WARNING_DAYS } = app.license.status()
        const today = new Date()

        // While in expiry period: email admins every 7 days until expiry
        if (expiring) {
            const isExpiryWarnStartDate = expiring && PRE_EXPIRE_WARNING_DAYS === daysRemaining
            const modulusOffset = PRE_EXPIRE_WARNING_DAYS % 7
            const isDayForReminder = expiring && ((daysRemaining - modulusOffset) % 7) === 0
            if (isExpiryWarnStartDate || isDayForReminder) {
                await emailAdmins(app, 'LicenseReminder', { days: daysRemaining })
            }
        }

        // On expiry date and every sunday: email admins to say license has expired
        if (expired) {
            const isSunday = date => date.getDay() === 0
            const expiryDate = new Date(expiresAt)
            const isExpiryDate = today.getFullYear() === expiryDate.getFullYear() &&
                today.getMonth() === expiryDate.getMonth() &&
                today.getDate() === expiryDate.getDate()
            if (isExpiryDate || isSunday(today)) {
                await emailAdmins(app, 'LicenseExpired', {})
            }
            // Log everyday the license is expired
            app.auditLog.Platform.platform.license.expired('system', null, app.license.get())

            // get list of running Instances
            const projectList = await app.db.models.Project.findAll({
                attributes: [
                    'id',
                    'state',
                    'ProjectStackId',
                    'TeamId'
                ],
                where: {
                    state: {
                        [Op.eq]: 'running'
                    }
                }
            })
            // Shut down all running projects
            projectList.forEach(async (project) => {
                try {
                    app.db.controllers.Project.setInflightState(project, 'suspending')
                    await app.containers.stop(project)
                    app.db.controllers.Project.clearInflightState(project)
                    await app.auditLog.Project.project.suspended(null, null, project)
                } catch (err) {
                    app.log.info(`Failed to suspend ${project.id} when licensed expired`)
                }
            })
        }
    }
}

async function emailAdmins (app, template, context) {
    const admins = await app.db.models.User.admins()
    for (const admin of admins) {
        await app.postoffice.send(admin, template, context)
    }
}
