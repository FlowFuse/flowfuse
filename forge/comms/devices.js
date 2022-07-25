/**
 * This module provides the handler for device status events - as well as APIs
 * for sending commands to devices.
 */

class DeviceCommsHandler {
    constructor (app, client) {
        this.app = app
        this.client = client

        // Listen for any incoming device status events
        client.on('status/device', (status) => { this.handleStatus(status) })
    }

    async handleStatus (status) {
        // Check it looks like a valid status message
        if (status.id && status.status) {
            const deviceId = status.id
            const device = await this.app.db.models.Device.byId(deviceId)
            if (!device) {
                // TODO: log invalid device
                return
            }
            try {
                const payload = JSON.parse(status.status)
                await this.app.db.controllers.Device.updateState(device, payload)

                // If the status state===unknown, the device is waiting for confirmation
                // it has the right details. Always response with an 'update' command in
                // this scenario
                let sendUpdateCommand = payload.state === 'unknown'

                if (Object.hasOwn(payload, 'project') && payload.project !== (device.Project?.id || null)) {
                    // The Project is incorrect
                    sendUpdateCommand = true
                }
                if (Object.hasOwn(payload, 'snapshot') && payload.snapshot !== (device.targetSnapshot?.hashid || null)) {
                    // The Snapshot is incorrect
                    sendUpdateCommand = true
                }
                if (Object.hasOwn(payload, 'settings') && payload.settings !== (device.settingsHash || null)) {
                    // The Settings are incorrect
                    sendUpdateCommand = true
                }

                if (sendUpdateCommand) {
                    this.sendCommand(device.Team.hashid, deviceId, 'update', {
                        project: device.Project?.id || null,
                        snapshot: device.targetSnapshot?.hashid || null,
                        settings: device.settingsHash || null
                    })
                }
            } catch (err) {
                // Not a JSON payload - ignore
            }
        }
    }

    /**
     * Send a command to all devices assigned to a project using the broadcast
     * topic.
     * @param {String} teamId
     * @param {String} projectId
     * @param {String} command
     * @param {Object} payload
     */
    sendCommandToProjectDevices (teamId, projectId, command, payload) {
        const topic = `ff/v1/${teamId}/p/${projectId}/command`
        this.client.publish(topic, JSON.stringify({
            command: command,
            ...payload
        }))
    }

    /**
     * Send a command to a specific device using its command topic.
     * @param {String} teamId
     * @param {String} deviceId
     * @param {String} command
     * @param {Object} payload
     */
    sendCommand (teamId, deviceId, command, payload) {
        const topic = `ff/v1/${teamId}/d/${deviceId}/command`
        this.client.publish(topic, JSON.stringify({
            command: command,
            ...payload
        }))
    }
}

module.exports = {
    DeviceCommsHandler: (app, client) => new DeviceCommsHandler(app, client)
}
