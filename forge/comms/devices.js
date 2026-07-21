/**
 * This module provides the handler for device status events - as well as APIs
 * for sending commands to devices.
 */

const SemVer = require('semver')
const { v4: uuidv4 } = require('uuid')

const noop = () => {}
const DEFAULT_TIMEOUT = 10000
const { filterAccessibleMCPServerFeatures } = require('../services/expert.js')

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
    payload: Object() // eslint-disable-line no-object-constructor
}
Object.freeze(CommandMessageTemplate)

/** @typedef {typeof CommandMonitorTemplate} ResponseMonitor */
/** @typedef {typeof CommandMessageTemplate} CommandMessage */
/**
 * @typedef MCPServerDetails
 * @property {any} team - team
 * @property {any} application - application
 * @property {any} instance - instance
 * @property {any} instanceName - instanceName
 * @property {any} instanceType - instanceType
 * @property {any} mcpServer - mcpServer
 * @property {any} mcpServerName - mcpServerName
 * @property {any} mcpEndpoint - mcpEndpoint
 * @property {any} mcpServerNameUnique - mcpServerNameUnique
 * @property {any} mcpServerDescription - mcpServerDescription
 * @property {any} mcpServerTitle - mcpServerTitle
 * @property {any} mcpServerVersion - mcpServerVersion
 */

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
        this.deviceResourcesHeartbeats = {}
        /** @type {Object.<string, typeof CommandResponseMonitor>} */
        this.inFlightCommands = {}
        this.deviceLogHeartbeatInterval = -1
        this.deviceResourcesHeartbeatInterval = -1

        // Listen for any incoming device status events
        client.on('status/device', (status) => { this.handleStatus(status) })
        client.on('response/device', (response) => { this.handleCommandResponse(response) })

        // Handle expert inflight requests sent from the FF Expert Agent - intended for an MCP server on a specific remote instance
        client.on('request/device/expert/insight', async (userId, command, /** @type {MCPServerDetails} */ mcpServer, mcpDefinitionKind, mcpDefinition, data, onSuccess, onError) => {
            // MCP ROUTE: step 2 (remote)
            // Called By: an MQTT inflight message (from the Expert Agent)
            // Calls To : device agent via the established command channel (sendCommandAwaitReply)

            const { team: teamId, application: applicationId, instance: instanceId, instanceType, mcpServer: mcpServerId } = mcpServer
            const isToolCall = command === 'mcp:call-tool'
            const isResourceCall = command === 'mcp:read-resource' && mcpDefinitionKind === 'mcp_resource'
            const isResourceTemplateCall = command === 'mcp:read-resource' && mcpDefinitionKind === 'mcp_resource_template'
            const toolDefinition = isToolCall ? mcpDefinition : null
            const resourceDefinition = isResourceCall ? mcpDefinition : null
            const resourceTemplateDefinition = isResourceTemplateCall ? mcpDefinition : null

            try {
                // Premise:
                // The incoming request contains information to call an MCP tool/resource on a specific instance.
                // 1. Check that the for the MCP server supplied, the user has access (application level)
                // 2. Check that the for the MCP server feature being performed (tool/resource/resource_template), that the user has access to (feature level)
                // 3. Re-resolve the MCP server against the team's trusted MCP registry, verify
                //    instance/application ownership, and get/create access tokens as needed based on the
                //    instance node security settings

                // first pass - basic sanity checks, picking up associated models for the user, team membership, etc
                if (!teamId || !applicationId || !instanceId || !mcpServerId || instanceType !== 'device') {
                    return onError('Invalid MCP request - missing required fields', 'MCP_INVALID_REQUEST')
                }

                if (typeof instanceId !== 'string') {
                    return onError('Invalid instance ID', 'MCP_INVALID_INSTANCE_ID')
                }

                const instance = await this.app.db.models.Device.byId(instanceId)
                if (!instance) {
                    return onError('Invalid instance', 'MCP_INVALID_INSTANCE')
                }

                // get associated db models for the user and team membership
                // reload the trusted registration and ensure it is still valid for this team and instance
                const registration = await app.db.models.MCPRegistration.byId(mcpServerId)
                if (!registration) {
                    return onError('No MCP registration found', 'MCP_NO_REGISTRATION')
                }

                const application = instance.Application
                await application.reload({ attributes: ['TeamId'] })
                const team = instance.Team

                const teamOk = team.hashid === teamId && application.TeamId === team.id && registration.TeamId === team.id
                const applicationOk = application.hashid === applicationId && instance.ApplicationId === application.id
                const instanceOk = registration.targetId === instance.id.toString() && registration.targetType === instanceType

                if (!teamOk || !applicationOk || !instanceOk) {
                    return onError('Invalid team, application, or instance', 'MCP_INVALID_TEAM_APPLICATION_INSTANCE')
                }

                const serverEntry = {
                    application,
                    server: {
                        ...mcpServer,
                        tools: toolDefinition ? [toolDefinition] : [],
                        resources: resourceDefinition ? [resourceDefinition] : [],
                        resourceTemplates: resourceTemplateDefinition ? [resourceTemplateDefinition] : []
                    }
                }
                const user = await app.db.models.User.byId(userId)
                if (!user || user.hashid !== userId) {
                    return onError('Invalid user', 'MCP_INVALID_USER')
                }
                const existingRole = await user.getTeamMembership(teamId)
                const accessibleServers = filterAccessibleMCPServerFeatures(app, [serverEntry], team, existingRole)
                const accessibleServer = accessibleServers.find(s => s.mcpServer === mcpServerId)
                if (!accessibleServer) {
                    return onError('User does not have access to MCP server', 'MCP_NO_ACCESS')
                }

                const commandData = {
                    kind: mcpDefinitionKind,
                    endpoint: null // updated below after checks and other data is appended
                }

                // Prepare command data based on the type of MCP call (tool, resource, or resource template)
                if (isToolCall) {
                    const accessibleTool = accessibleServer.tools.find(t => t.name === data.name)
                    if (!accessibleTool) {
                        return onError('User does not have access to MCP tool', 'MCP_NO_ACCESS_TOOL')
                    }
                    commandData.name = data.name
                    commandData.input = data.input
                } else if (isResourceCall) {
                    const accessibleResource = accessibleServer.resources.find(r => r.uri === resourceDefinition.uri)
                    if (!accessibleResource) {
                        return onError('User does not have access to MCP resource', 'MCP_NO_ACCESS_RESOURCE')
                    }
                    commandData.uri = data.uri
                } else if (isResourceTemplateCall) {
                    const accessibleResourceTemplate = accessibleServer.resourceTemplates.find(r => r.uriTemplate === resourceTemplateDefinition.uriTemplate)
                    if (!accessibleResourceTemplate) {
                        return onError('User does not have access to MCP resource template', 'MCP_NO_ACCESS_RESOURCE_TEMPLATE')
                    }
                    // Prepare the commandData for the resource template call, including resolving the final URI from the template and input values
                    // NOTE: The Expert Agent will typically unfurl the template and provide a fully resolved URI, but if it is not provided (or contains
                    // placeholders), we will compute it below using the template and input values
                    commandData.uri = data.uri
                    commandData.uriTemplate = data.uriTemplate
                    commandData.input = data.input
                    if ((!commandData.uri || /\{([^}]+)\}/.test(commandData.uri))) {
                        // compute the final URI by replacing placeholders in the template with input values
                        const template = data.uriTemplate || commandData.uri
                        const input = data.input || {}
                        commandData.uri = template.replace(/\{([^}]+)\}/g, (match, key) => {
                            const cleanKey = key.replace(/[*?]/g, '') // strip RFC6570 modifiers e.g. {var*} or {var?} to get the clean key for input lookup
                            return input[cleanKey] !== undefined ? encodeURIComponent(input[cleanKey]) : match
                        })
                    }
                } else {
                    return onError('Invalid MCP command', 'MCP_INVALID_COMMAND')
                }

                // update the endpoint with the resolved access token for the instance and team
                const teamType = await instance.Team.getTeamType()
                const teamHttpSecurityFeature = !!teamType.properties.features?.teamHttpSecurity
                commandData.endpoint = {
                    mcpEndpoint: mcpServer.mcpEndpoint,
                    headers: mcpServer.headers || {},
                    accessToken: await app.expert.mcp.getOrCreateToken(instance, mcpServer.instanceType, instanceId, teamHttpSecurityFeature) || null
                }

                try {
                    const result = await this.sendCommandAwaitReply(teamId, instanceId, command, commandData, { timeout: 30000 })
                    onSuccess(result)
                } catch (err) {
                    return onError(`An error occurred performing insight request: ${err.message}`, 'MCP_INSIGHT_REQUEST_ERROR', err)
                }
            } catch (err) {
                return onError(`Error handling expert insights inflight request: ${err.message}`, 'MCP_INSIGHT_REQUEST_ERROR', err)
            }
        })
        client.on('logs/heartbeat', (beat) => {
            this.deviceLogHeartbeats[beat.id] = beat.timestamp
        })
        client.on('logs/disconnect', (beat) => {
            const parts = beat.id.split(':')
            this.sendCommand(parts[0], parts[1], 'stopLog', '')
            this.app.log.info(`Disable device logging ${parts[1]} in team ${parts[0]}`)
            delete this.deviceLogHeartbeats[beat.id]
        })

        this.deviceLogHeartbeatInterval = setInterval(() => {
            const now = Date.now()
            for (const [key, value] of Object.entries(this.deviceLogHeartbeats)) {
                if (now - value > 12500) {
                    const parts = key.split(':')
                    this.sendCommand(parts[0], parts[1], 'stopLog', '')
                    this.app.log.info(`Disable device logging ${parts[1]} in team ${parts[0]}`)
                    delete this.deviceLogHeartbeats[key]
                }
            }
        }, 15000)

        client.on('resources/heartbeat', (beat) => {
            this.deviceResourcesHeartbeats[beat.id] = beat.timestamp
        })
        client.on('resources/disconnect', (beat) => {
            const parts = beat.id.split(':')
            this.sendCommand(parts[0], parts[1], 'stopResources', '')
            this.app.log.info(`Disable device logging ${parts[1]} in team ${parts[0]}`)
            delete this.deviceResourcesHeartbeats[beat.id]
        })

        this.deviceResourcesHeartbeatInterval = setInterval(() => {
            const now = Date.now()
            for (const [key, value] of Object.entries(this.deviceResourcesHeartbeats)) {
                if (now - value > 12500) {
                    const parts = key.split(':')
                    this.sendCommand(parts[0], parts[1], 'stopResources', '')
                    this.app.log.info(`Disable device resources ${parts[1]} in team ${parts[0]}`)
                    delete this.deviceResourcesHeartbeats[key]
                }
            }
        }, 15000)
    }

    async handleStatus (status) {
        // Check it looks like a valid status message
        if (status.id && status.status) {
            const deviceId = status.id
            // Load a minimal device model without any associations.
            const device = await this.app.db.models.Device.byId(deviceId, { includeAssociations: false })
            if (!device) {
                // TODO: log invalid device
                return
            }
            const teamId = this.app.db.models.Team.encodeHashid(device.TeamId)
            const startTime = Date.now()
            try {
                const previousState = device.state
                const previousOnlineStatus = device.status
                const payload = JSON.parse(status.status)
                await this.app.db.controllers.Device.updateState(device, payload)

                if (payload === null) {
                    // This device is busy updating - don't interrupt it
                    this.app.log.info({ msg: 'Device status update - null status', device: deviceId, team: teamId, responseTime: Date.now() - startTime })
                    return
                }

                const maskTransientStop = previousState === 'restarting' && payload.state === 'stopped'
                const stateChanged = !maskTransientStop && payload.state !== previousState
                const cameOnline = previousOnlineStatus !== 'online'
                if (stateChanged || cameOnline) {
                    this.app.comms.team.notifyDeviceState(teamId, status.id, { state: payload.state, onlineStatus: 'online' })
                }

                // If the status state===unknown, the device is waiting for confirmation
                // it has the right details. Always response with an 'update' command in
                // this scenario
                let sendUpdateCommand = payload.state === 'unknown'
                let sendUpdateReason = []
                // If the device is owned by an application (in the DB) and the agent is reporting version < 1.11.0
                // then we need to send an update command to the device
                if (Object.hasOwn(payload, 'snapshot') && device.isApplicationOwned) {
                    if (!device.agentVersion || SemVer.lt(device.agentVersion, '1.11.0')) {
                        sendUpdateCommand = true
                    }
                }
                if (Object.hasOwn(payload, 'project') && payload.project !== (device.ProjectId || null)) {
                    // The Project is incorrect
                    sendUpdateReason.push('project')
                    sendUpdateCommand = true
                }
                if (Object.hasOwn(payload, 'application')) {
                    // The payload contains an application hashid - get the hashid of the expected application
                    const expectedApplicationId = device.ApplicationId ? this.app.db.models.Application.encodeHashid(device.ApplicationId) : null
                    if (payload.application !== expectedApplicationId) {
                        // The Application is incorrect
                        sendUpdateReason.push('application')
                        sendUpdateCommand = true
                    }
                }
                if (Object.hasOwn(payload, 'snapshot')) {
                    // The payload contains a snapshot hashid - get the hashid of the expected snapshot
                    let targetSnapshotId = device.targetSnapshotId
                    if (targetSnapshotId) {
                        targetSnapshotId = this.app.db.models.ProjectSnapshot.encodeHashid(targetSnapshotId)
                    }
                    const reportedSnapshotId = payload.snapshot === '0' ? null : payload.snapshot
                    if (reportedSnapshotId !== (targetSnapshotId || null)) {
                        sendUpdateReason.push('snapshot')
                        sendUpdateCommand = true // The Snapshot reported in device status does not match the device model target snapshot
                    } else if (reportedSnapshotId && !device.isApplicationOwned) {
                        // load the full snapshot (as specified by the device status) from the db so we can check the snapshots
                        // `ProjectId` is "something" (not orphaned) and matches the device's project
                        const reportedSnapshot = (await this.app.db.models.ProjectSnapshot.byId(reportedSnapshotId, { includeFlows: false, includeSettings: false }))
                        if (reportedSnapshot && payload.project !== (reportedSnapshot?.ProjectId || null)) {
                            // The project the device is reporting it belongs to does not match the target Snapshot parent project
                            sendUpdateReason.push('snapshot')
                            sendUpdateCommand = true
                        }
                    }
                }
                if (Object.hasOwn(payload, 'settings') && payload.settings !== (device.settingsHash || null)) {
                    // The Settings are incorrect
                    sendUpdateReason.push('settings')
                    sendUpdateCommand = true
                }

                if (sendUpdateCommand) {
                    sendUpdateReason = sendUpdateReason.join(',')
                    await this.app.db.controllers.Device.sendDeviceUpdateCommand(device)
                } else {
                    sendUpdateReason = undefined
                }
                this.app.log.info({ msg: 'Device status update', device: deviceId, team: teamId, sendUpdateCommand, sendUpdateReason, responseTime: Date.now() - startTime })
            } catch (err) {
                this.app.log.info({ msg: 'Device status update error', device: deviceId, team: teamId, responseTime: Date.now() - startTime, err: err.message })
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
                delete this.inFlightCommands[message.correlationData]
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
     * @param {Object} routingOptions Options
     * @param {Number} [routingOptions.timeout=DEFAULT_TIMEOUT] The timeout in milliseconds to wait for a response
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
            inFlightCommand.reject = async (err) => {
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
        clearInterval(this.deviceResourcesHeartbeatInterval)
    }
}

module.exports = {
    DeviceCommsHandler: (app, client) => new DeviceCommsHandler(app, client)
}
