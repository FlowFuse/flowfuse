module.exports = {
    name: 'licenseOverage',
    startup: true,
    schedule: '@weekly', // Run once a week, sunday midnight
    run: async function (app) {
        try {
            const { users, teams, projects, devices } = await app.license.usage()
            if (users?.count > users?.limit) {
                await app.auditLog.Platform.platform.license.overage('system', null, users)
            }
            if (teams?.count > teams?.limit) {
                await app.auditLog.Platform.platform.license.overage('system', null, teams)
            }
            if (projects?.count > projects?.limit) {
                await app.auditLog.Platform.platform.license.overage('system', null, projects)
            }
            if (devices?.count > devices?.limit) {
                await app.auditLog.Platform.platform.license.overage('system', null, devices)
            }
        } catch (error) {
            app.log.error(error)
        }
    }
}
