const { literal } = require('sequelize')

module.exports = {
    updateState: async function (app, device, state) {
        if (state.state) {
            device.set('state', state.state)
        }
        if (state.agentVersion) {
            device.set('agentVersion', state.agentVersion)
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
    },
    /**
     * Sends the project id, snapshot hash and settings hash to the device
     * so that the device can determine what/if it needs to update
     * @param {forge.db.models.Device} device The device to send an "update" command to
     */
    sendDeviceUpdateCommand: async function (app, device) {
        if (app.comms) {
            let snapshotId = device.targetSnapshot?.hashid || null
            if (snapshotId) {
                // device.targetSnapshot is a limited  view so we need to load the it from the db
                // check it has an associated project and that it matches the device's project
                const targetSnapshot = (await app.db.models.ProjectSnapshot.byId(snapshotId))
                if (!targetSnapshot || !targetSnapshot.ProjectId || targetSnapshot.ProjectId !== device.ProjectId) {
                    snapshotId = null // target snapshot is not associated with this project (possibly orphaned), set it to null
                }
            }
            const payload = {
                ownerType: device.ownerType,
                application: device.Application?.hashid || null,
                project: device.Project?.id || null,
                snapshot: snapshotId,
                settings: device.settingsHash || null,
                mode: device.mode,
                licensed: app.license.active()
            }
            // if the device is assigned to an application but has no snapshot we need to send enough
            // info to start the device in application mode so that it can start node-red and
            // permit the user to generate new flows and submit a snapshot
            if (device.ownerType === 'application' && device.Application?.hashid && payload.snapshot === null) {
                delete payload.project // exclude project property to avoid triggering the wrong kind of update
                payload.application = device.Application?.hashid
                payload.snapshot = '0' // '0' is temporary value to indicate that the device should start in application mode with starter flows
            }
            app.comms.devices.sendCommand(device.Team.hashid, device.hashid, 'update', payload)
        }
    },
    /**
     * Remove platform specific environment variables
     * @param {[{name:string, value:string}]} envVars Environment variables array
     */
    removePlatformSpecificEnvVars: function (app, envVars) {
        if (!envVars || !Array.isArray(envVars)) {
            return []
        }
        return [...envVars.filter(e => e.name.startsWith('FF_') === false)]
    },
    /**
     * Insert platform specific environment variables
     * @param {Device} device The device
     * @param {[{name:string, value:string}]} envVars Environment variables array
     */
    insertPlatformSpecificEnvVars: function (app, device, envVars) {
        if (!envVars || !Array.isArray(envVars)) {
            envVars = []
        }
        const makeVar = (name, value) => {
            return { name, value: value || '', platform: true } // add `platform` flag for UI
        }
        const result = []
        let snapshotId
        let snapshotName
        if (device.ownerType === 'project') {
            snapshotId = device.targetSnapshot?.hashid || ''
            snapshotName = device.targetSnapshot?.name || ''
        } else if (device.ownerType === 'application') {
            snapshotId = '0' // '0' is temporary value to indicate that the device should start in application mode with starter flows
            snapshotName = 'None'
            result.push(makeVar('FF_APPLICATION_ID', device.Application?.hashid || ''))
            result.push(makeVar('FF_APPLICATION_NAME', device.Application?.name || ''))
        }
        result.push(makeVar('FF_DEVICE_ID', device.hashid || ''))
        result.push(makeVar('FF_DEVICE_NAME', device.name || ''))
        result.push(makeVar('FF_DEVICE_TYPE', device.type || ''))
        result.push(makeVar('FF_SNAPSHOT_ID', snapshotId))
        result.push(makeVar('FF_SNAPSHOT_NAME', snapshotName))
        result.push(...app.db.controllers.Device.removePlatformSpecificEnvVars(envVars))
        return result
    },

    /**
     * Export a device config for snapshotting back up to the forge
     * @param {import('../../forge').forge} app Forge app instance
     * @param {Object} device The device to export the config from
     */
    exportConfig: async function (app, device) {
        // request config and flows from device
        if (app.comms) {
            const config = await app.comms.devices.sendCommandAwaitReply(device.Team.hashid, device.hashid, 'upload', { timeout: 10000 })
            if (config) {
                return config
            }
        }
        return null
    }
}
