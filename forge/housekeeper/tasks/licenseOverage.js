module.exports = {
    name: 'licenseOverage',
    startup: true,
    schedule: '@weekly', // Run once a week, sunday midnight
    run: async function (app) {
        const { users, teams, instances, devices } = await app.license.usage()
        if (users?.count > users?.limit) {
            await app.auditLog.Platform.platform.license.overage('system', null, users)
        }
        if (teams?.count > teams?.limit) {
            await app.auditLog.Platform.platform.license.overage('system', null, teams)
        }
        if (instances?.count > instances?.limit) {
            await app.auditLog.Platform.platform.license.overage('system', null, instances)
        }
        if (devices?.count > devices?.limit) {
            await app.auditLog.Platform.platform.license.overage('system', null, devices)
        }
    }
}
