const { literal } = require('sequelize')

module.exports = {
    updateState: async function (app, device, state) {
        if (state.state) {
            device.set('state', state.state)
        }
        device.set('lastSeenAt', literal('CURRENT_TIMESTAMP'))
        if (!state.snapshot) {
            if (device.currentSnapshot !== null) {
                device.set('activeSnapshotId', null)
            }
        } else {
            // Check the snapshot is one we recognise
            const snapshotId = app.db.models.ProjectSnapshot.decodeHashid(state.snapshot)
            // hashid.decode returns an array of values, not the raw value.
            if (snapshotId.length > 0) {
                // check to see if snapshot still exists
                if (await app.db.models.ProjectSnapshot.byId(state.snapshot)) {
                    device.set('activeSnapshotId', snapshotId)
                }
            }
        }
        await device.save()
    }
}
