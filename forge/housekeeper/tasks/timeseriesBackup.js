const { randomInt } = require('../utils')

module.exports = {
    name: 'timeseriesBackup',
    // A random time between 01:00 and 03:59, so horizontally scaled instances don't line up
    schedule: `${randomInt(0, 59)} ${randomInt(1, 3)} * * *`,
    run: async function (app) {
        if (!app.timeseries?.backupsEnabled) {
            return
        }
        await app.timeseries.backupAll()
    }
}
