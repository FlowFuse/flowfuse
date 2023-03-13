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
        }
    }
}

async function emailAdmins (app, template, context) {
    const admins = await app.db.models.User.admins()
    for (const admin of admins) {
        await app.postoffice.send(admin, template, context)
    }
}
