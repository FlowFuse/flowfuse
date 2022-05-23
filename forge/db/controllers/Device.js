const { literal } = require('sequelize')

module.exports = {
    updateState: async function (app, device, state) {
        device.set('lastSeenAt', literal('CURRENT_TIMESTAMP'))
        if (!state.snapshot) {
            if (device.currentSnapshot !== null) {
                device.set('activeSnapshotId', null)
            }
        } else {
            const snapshotId = app.db.models.ProjectSnapshot.decodeHashid(state.snapshot)
            device.set('activeSnapshotId', snapshotId)
        }
        await device.save()
    }
}
