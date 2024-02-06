/**
 * This module provides the handler for device status events - as well as APIs
 * for sending commands to devices.
 */

const SemVer = require('semver')
const { v4: uuidv4 } = require('uuid')

const noop = () => {}
const DEFAULT_TIMEOUT = 10000

// declare command and response monitor types (and freeze them)
const CommandMonitorTemplate = {
    resolve: () => Promise.resolve({}),
    reject: () => Promise.reject(new Error('Command rejected')),
    resolved: false,
    rejected: false,
    createdAt: 0,
    expiresAt: 0,
    command: '',
    deviceId: '',
    teamId: '',
    correlationData: ''
}
Object.freeze(CommandMonitorTemplate)

const CommandMessageTemplate = {
    command: '',
    deviceId: '',
    teamId: '',
    correlationData: '',
    createdAt: 0,
    expiresAt: 0,
    payload: Object()
}
Object.freeze(CommandMessageTemplate)

/** @typedef {typeof CommandMonitorTemplate} ResponseMonitor */
/** @typedef {typeof CommandMessageTemplate} CommandMessage */

/**
 * DeviceCommsHandler
 * @class DeviceCommsHandler
 * @memberof forge.comms
 */
class DeviceCommsHandler {
    /**
     * New DeviceCommsHandler instance
     * @param {import('../forge').ForgeApplication} app Fastify app
     * @param {import('./commsClient').CommsClient} client Comms Client
     */
    constructor (app, client) {
        this.app = app
        this.client = client
        this.deviceLogClients = {}
        this.deviceLogHeartbeats = {}
        /** @type {Object.<string, typeof CommandResponseMonitor>} */
        this.inFlightCommands = {}
        this.deviceLogHeartbeatInterval = -1

        // Listen for any incoming device status events
        client.on('status/device', (status) => { this.handleStatus(status) })
        client.on('response/device', (response) => { this.handleCommandResponse(response) })
        client.on('logs/heartbeat', (beat) => {
            this.deviceLogHeartbeats[beat.id] = beat.timestamp
        })

        this.deviceLogHeartbeatInterval = setInterval(() => {
            const now = Date.now()
            for (const [key, value] of Object.entries(this.deviceLogHeartbeats)) {
                if (now - value > 25000) {
                    const parts = key.split(':')
                    this.sendCommand(parts[0], parts[1], 'stopLog', '')
                    this.app.log.info(`Disable device logging ${parts[1]} in team ${parts[0]}`)
                    delete this.deviceLogHeartbeats[key]
                }
            }
        }, 30000)
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

                if (payload === null) {
                    // This device is busy updating - don't interrupt it
                    return
                }

                // If the status state===unknown, the device is waiting for confirmation
                // it has the right details. Always response with an 'update' command in
                // this scenario
                let sendUpdateCommand = payload.state === 'unknown'

                // If the device is owned by an application (in the DB) and the agent is reporting version < 1.11.0
                // then we need to send an update command to the device
                if (Object.hasOwn(payload, 'snapshot') && device.isApplicationOwned) {
                    if (!device.agentVersion || SemVer.lt(device.agentVersion, '1.11.0')) {
                        sendUpdateCommand = true
                    }
                }
                if (Object.hasOwn(payload, 'project') && payload.project !== (device.Project?.id || null)) {
                    // The Project is incorrect
                    sendUpdateCommand = true
                }
                if (Object.hasOwn(payload, 'application') && payload.application !== (device.Application?.hashid || null)) {
                    // The Application is incorrect
                    sendUpdateCommand = true
                }
                if (Object.hasOwn(payload, 'snapshot')) {
                    // load the full snapshot (as specified by the device) from the db so we can check the snapshots
                    // `ProjectId` is "something" (not orphaned) and matches the device's project
                    const targetSnapshot = (await this.app.db.models.ProjectSnapshot.byId(payload.snapshot, { includeFlows: false, includeSettings: false }))
                    if (payload.snapshot !== (targetSnapshot?.hashid || null)) {
                        // The Snapshot is incorrect
                        sendUpdateCommand = true
                    } else if (targetSnapshot && !device.isApplicationOwned && payload.project !== (targetSnapshot?.ProjectId || null)) {
                        // The project the device is reporting it belongs to does not match the target Snapshot parent project
                        sendUpdateCommand = true
                    }
                }
                if (Object.hasOwn(payload, 'settings') && payload.settings !== (device.settingsHash || null)) {
                    // The Settings are incorrect
                    sendUpdateCommand = true
                }

                if (sendUpdateCommand) {
                    await this.app.db.controllers.Device.sendDeviceUpdateCommand(device)
                }
            } catch (err) {
                // Not a JSON payload - ignore
                if (err instanceof SyntaxError) {
                    return
                }

                throw err
            }
        }
    }

    /**
     * Handle a command response message from a device
     * Typically this will be a response to a command sent by the platform
     * @param {Object} response Reply from the device
     * @returns {Promise<void>}
     * @see sendCommandAwaitReply
     */
    async handleCommandResponse (response) {
        // Check it looks like a valid response to a command
        // The response part should have the following:
        // * id: the device id
        // * message: the structured response (see below)
        // the message part should have the following:
        // * teamId: for message routing and verification
        // * deviceId: for message routing and verification
        // * command: // for command response verification
        // * correlationData: for correlating response with request
        // * payload: the actual response payload
        if (response.id && typeof response.message === 'string') {
            const message = JSON.parse(response.message)
            if (!message.command || !message.correlationData || !message.payload) {
                return // Not a valid response
            }
            const deviceId = response.id
            const device = await this.app.db.models.Device.byId(deviceId)
            if (!device) {
                return // Not a valid device
            }

            const inFlightCommand = this.inFlightCommands[message.correlationData]
            if (inFlightCommand) {
                // This command is known to the local instance - process it
                inFlightCommand.resolve(message.payload)
                delete this.inFlightCommands[response.correlationData]
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
     * Send a command to all devices assigned to an application using the broadcast
     * topic.
     * @param {String} teamId
     * @param {String} projectId
     * @param {String} command
     * @param {Object} payload
     */
    sendCommandToApplicationDevices (teamId, applicationId, command, payload) {
        const topic = `ff/v1/${teamId}/a/${applicationId}/command`
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
     * @param {import('mqtt').IClientPublishOptions} [options]
     * @param {import('mqtt').PacketCallback} [callback]
     */
    sendCommand (teamId, deviceId, command, payload, options, callback) {
        if (typeof options === 'function') {
            callback = options
            options = {}
        }
        callback = callback || noop
        const topic = `ff/v1/${teamId}/d/${deviceId}/command`
        this.client.publish(topic, JSON.stringify({
            command,
            ...payload
        }),
        options,
        callback)
    }

    async sendCommandAsync (teamId, deviceId, command, payload, options) {
        return new Promise((resolve, reject) => {
            this.sendCommand(teamId, deviceId, command, payload, options, (err, packet) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    /**
     * Send a command to a specific device using its command topic and wait for a response.
     * The response will be received by [handleCommandResponse]{@link handleCommandResponse}
     * @param {String} teamId The team Id this device belongs to
     * @param {String} deviceId The device Id
     * @param {String} command The command to send to the device
     * @param {Object} payload The payload to send to the device
     * @param {Object} options Options
     * @param {Number} options.timeout The timeout in milliseconds to wait for a response
     * @returns {Promise<Any>} The response payload
     * @see handleCommandResponse
     */
    async sendCommandAwaitReply (teamId, deviceId, command, payload, options = { timeout: DEFAULT_TIMEOUT }) {
        // sanitise the options object
        options = options || {}
        options.timeout = (typeof options.timeout === 'number' && options.timeout > 0) ? options.timeout : DEFAULT_TIMEOUT

        const inFlightCommand = DeviceCommsHandler.newResponseMonitor(command, deviceId, teamId, this.client.platformId, options)

        const promise = new Promise((resolve, reject) => {
            inFlightCommand.resolve = (payload) => {
                inFlightCommand.resolved = true
                clearTimeout(inFlightCommand.timer)
                resolve(payload)
                delete this.inFlightCommands[inFlightCommand.correlationData]
            }
            inFlightCommand.reject = (err) => {
                inFlightCommand.rejected = true
                clearTimeout(inFlightCommand.timer)
                reject(err)
                delete this.inFlightCommands[inFlightCommand.correlationData]
            }
        })

        // create a promise with timeout
        inFlightCommand.timer = setTimeout(() => {
            if (inFlightCommand.resolved) return
            if (inFlightCommand.rejected) return
            inFlightCommand.reject(new Error('Command timed out'))
        }, options.timeout)

        this.inFlightCommands[inFlightCommand.correlationData] = inFlightCommand

        // Generate suitable MQTT options
        /** @type {import('mqtt').IClientPublishOptions} */
        const mqttOptions = {}

        // add response topic, correlation data and user properties to the payload
        const commandData = DeviceCommsHandler.newCommandMessage(inFlightCommand, payload)
        // send command, return the promise and await response
        this.sendCommand(teamId, deviceId, command, commandData, mqttOptions)
        return promise
    }

    /**
     * Build a new command message object for sending to a device
     * @param {ResponseMonitor} cmr The `ResponseMonitor` object to build this new command message from
     * @param {Object} payload The payload to send to the device
     * @returns {CommandMessage}
     */
    static newCommandMessage (cmr, payload) {
        // clone the CommandMessage type object
        /** @type {CommandMessage} */
        const commandMessage = Object.assign({}, CommandMessageTemplate)
        commandMessage.command = cmr.command
        commandMessage.createdAt = cmr.createdAt
        commandMessage.expiresAt = cmr.expiresAt
        commandMessage.deviceId = cmr.deviceId
        commandMessage.teamId = cmr.teamId
        commandMessage.correlationData = cmr.correlationData
        commandMessage.responseTopic = `ff/v1/${cmr.teamId}/d/${cmr.deviceId}/response/${cmr.platformId}`
        commandMessage.payload = payload
        return commandMessage
    }

    /**
     * Build a new ResponseMonitor object for correlating with the response from a device
     * @param {String} command The command
     * @param {String} deviceId The device Id
     * @param {String} teamId The team Id
     * @param {Object} [options={ timeout: DEFAULT_TIMEOUT }] Options
     * @returns {ResponseMonitor}
     */
    static newResponseMonitor (command, deviceId, teamId, platformId, options = { timeout: DEFAULT_TIMEOUT }) {
        const now = Date.now()
        const correlationData = uuidv4() // generate a random correlation data (uuid)
        /** @type {ResponseMonitor} */
        const responseMonitor = Object.assign({}, CommandMonitorTemplate)
        responseMonitor.command = command
        responseMonitor.resolve = null
        responseMonitor.reject = null
        responseMonitor.resolved = false
        responseMonitor.rejected = false
        responseMonitor.createdAt = now
        responseMonitor.expiresAt = now + options?.timeout || DEFAULT_TIMEOUT
        responseMonitor.deviceId = deviceId
        responseMonitor.teamId = teamId
        responseMonitor.platformId = platformId
        responseMonitor.correlationData = correlationData
        return responseMonitor
    }

    /**
     * Enable the Node-RED editor on a device
     * @param {String} teamId Team id of the device
     * @param {String} deviceId Device id
     */
    async enableEditor (teamId, deviceId, token) {
        // * Enable Device Editor (Step 5) - (forge->device:MQTT) send command "startEditor" and the token in the payload
        return await this.sendCommandAwaitReply(teamId, deviceId, 'startEditor', { token }) // returns true if successful
    }

    /**
     * Disable the Node-RED editor on a device
     * @param {String} teamId Team id of the device
     * @param {String} deviceId Device id
     */
    async disableEditor (teamId, deviceId) {
        await this.sendCommandAsync(teamId, deviceId, 'stopEditor', '')
    }

    /**
     * Shutdown log heartbeat interval
     */
    async stopLogWatcher () {
        for (const [key] of Object.entries(this.deviceLogHeartbeats)) {
            const parts = key.split(':')
            try {
                await this.sendCommandAsync(parts[0], parts[1], 'stopLog', '')
                this.app.log.info(`Disable device logging ${parts[1]}`)
            } catch (err) {
                // ignore as shutting down
            }
        }
        clearInterval(this.deviceLogHeartbeatInterval)
    }
}

module.exports = {
    DeviceCommsHandler: (app, client) => new DeviceCommsHandler(app, client)
}
