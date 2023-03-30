/**
 * This module provides the handler for device status events - as well as APIs
 * for sending commands to devices.
 */

class DeviceCommsHandler {
    constructor (app, client) {
        this.app = app
        this.client = client

        this.deviceLogClients = {}

        // Listen for any incoming device status events
        client.on('status/device', (status) => { this.handleStatus(status) })
        client.on('logs/device', (log) => { this.forwardLog(log)})
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
                    this.app.db.controllers.Device.sendDeviceUpdateCommand(device)
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
            command,
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
            command,
            ...payload
        }))
    }

    /**
     * Steam logs to web from devices
     * @param {String} teamId
     * @param {String} deviceId
     * @param {WebSocket} socket
     */
    streamLogs (teamId, deviceId, socket) {
        if (this.deviceLogClients[deviceId]) {
            this.deviceLogClients[deviceId].counter++
        } else {
            this.deviceLogClients[deviceId] = {
                counter: 1,
                socket
            }
            this.sendCommand(teamId, deviceId, 'startLog', '')
            this.app.log.info(`Enable device logging ${deviceId}`)
        }

        socket.on('close', () => {
            if (this.deviceLogClients[deviceId]?.counter === 1) {
                delete this.deviceLogClients[deviceId]
                this.sendCommand(teamId, deviceId, 'stopLog', '')
                this.app.log.info(`Disable device logging ${deviceId}`)
            }
        })
    }

    forwardLog (log) {
        const dev = this.deviceLogClients[log.id]
        if (dev) {
            dev.socket.send(log.logs)
        } else {
            // socket not found
        }
    }
}

module.exports = {
    DeviceCommsHandler: (app, client) => new DeviceCommsHandler(app, client)
}
