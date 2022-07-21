class DeviceCommsHandler {
    constructor (app, client) {
        this.app = app
        this.client = client
    }

    async handleStatus (status) {
        if (status.id && status.status) {
            const deviceId = status.id
            const payload = JSON.parse(status.status)
            const device = await this.app.db.models.Device.byId(deviceId)
            if (!device) {
                // TODO: log invalid device
                return
            }
            await this.app.db.controllers.Device.updateState(device, payload)
            let sendUpdateCommand = payload.state === 'unknown'
            if (Object.hasOwn(payload, 'project') && payload.project !== (device.Project?.id || null)) {
                sendUpdateCommand = true
            }
            if (Object.hasOwn(payload, 'snapshot') && payload.snapshot !== (device.targetSnapshot?.hashid || null)) {
                sendUpdateCommand = true
            }
            if (Object.hasOwn(payload, 'settings') && payload.settings !== (device.settingsHash || null)) {
                sendUpdateCommand = true
            }

            if (sendUpdateCommand) {
                this.sendCommand(device.Team.hashid, deviceId, 'update', {
                    project: device.Project?.id || null,
                    snapshot: device.targetSnapshot?.hashid || null,
                    settings: device.settingsHash || null
                })
            }
        }
    }

    sendCommandToProjectDevices (teamId, projectId, command, payload) {
        const topic = `ff/v1/${teamId}/p/${projectId}/command`
        this.client.publish(topic, JSON.stringify({
            command: command,
            ...payload
        }))
    }

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
