const { randomBytes } = require('crypto')
const EventEmitter = require('events')

const mqtt = require('mqtt')
const { v4: uuidv4 } = require('uuid')

/**
 * MQTT Client wrapper. This connects to the platform broker and subscribes
 * to the appropriate status topics.
 */
class CommsClient extends EventEmitter {
    constructor (app) {
        super()
        this.app = app
        this.platformId = uuidv4()
    }

    async init () {
        // To aid testing, we use a url of `:test:` to allow us to configure
        // the platform with comms enabled, but no active MQTT connection
        if (this.app.config.broker.url !== ':test:') {
            /** @type {mqtt.IClientOptions} */
            const brokerConfig = {
                clientId: 'forge_platform:' + randomBytes(8).toString('hex'),
                username: 'forge_platform',
                password: await this.app.settings.get('commsToken'),
                reconnectPeriod: 5000,
                protocolVersion: 5,
                will: {
                    topic: 'ff/v1/platform/leader',
                    payload: JSON.stringify({ id: this.platformId, vote: -1 })
                }
            }
            this.client = mqtt.connect(this.app.config.broker.url, brokerConfig)
            this.client.on('connect', () => {
                this.app.log.info('Connected to comms broker')
            })
            this.client.on('reconnect', () => {
                this.app.log.info('Reconnecting to comms broker')
            })
            this.client.on('disconnect', (disconnectPacket) => {
                const rc = disconnectPacket?.reasonCode || 'unknown reason code'
                const reason = disconnectPacket?.properties?.reasonString || 'no reason given'
                this.app.log.info(`Broker disconnected: reason code '${rc}'. ${reason}.`)
            })
            this.client.on('error', (err) => {
                this.app.log.info(`Connection error to comms broker: ${err.toString()}`)
            })
            this.client.on('message', (topic, message, packet) => {
                const topicParts = topic.split('/')
                const ownerType = topicParts[3]
                const ownerId = topicParts[4]
                const messageType = topicParts[5]

                if (topicParts[2] === 'expert') {
                    const userId = topicParts[3]
                    const sessionId = topicParts[4]
                    const channel = topicParts[5] // platform
                    const channelCommand = topicParts[6] // dynamic value, e.g. mcp:call-tool or mcp:read-resource
                    const direction = topicParts[7] // request or response (only for inflight channels)

                    // these are common for both insights and platform automations
                    let payload
                    try {
                        payload = JSON.parse(message.toString())
                    } catch (err) {
                        this.app.log.warn(`Ignoring malformed expert payload on ${topic}: ${err.message}`)
                        return
                    }
                    const correlationData = packet.properties?.correlationData
                    const userProperties = packet.properties?.userProperties
                    const mqttOptions = { properties: { correlationData, userProperties } }

                    if (!correlationData || !userProperties) {
                        this.app.log.warn(`'Tool call request missing correlationData or userProperties: ${message.toString()}`)
                        return // do not respond, the agent will timeout and handle it
                    }
                    // end common bits

                    const supportedInsightsCommands = {
                        'insights:mcp-call-tool': 'mcp:call-tool',
                        'insights:mcp-read-resource': 'mcp:read-resource'
                    }
                    const supportedPlatformAutomationCommands = {
                        'automation:mcp-get-features': 'mcp-get-features',
                        'automation:mcp-call-tool': 'mcp-call-tool'
                    }

                    if (supportedInsightsCommands[channelCommand] && direction === 'request') {
                        const isInsightsToolCall = channel === 'platform' && channelCommand === 'insights:mcp-call-tool' && direction === 'request'
                        const isInsightsResourceCall = channel === 'platform' && channelCommand === 'insights:mcp-read-resource' && direction === 'request'
                        // MCP ROUTE: step 1 (hosted/remote common)
                        // Called By: from the Expert Agent (via MQTT inflight request)
                        // Calls To : inflight request handler (./instances.js or ./devices.js)

                        // When the topic is determined to be an expert insights inflight request, the acl manager has already verified the user
                        // has permission to access this topic. Now, we verify the payload contains the required fields to process the request.
                        // If OK, emit the message to the appropriate instance/device handler (handled in ./instances.js or ./devices.js)

                        const command = supportedInsightsCommands[channelCommand]
                        const data = payload.data || {}
                        const { kind, mcpServer, toolDefinition, resourceDefinition, resourceTemplateDefinition } = payload.meta || {}
                        const responseTopic = `ff/v1/expert/${userId}/${sessionId}/${channel}/${channelCommand}/response`
                        const { onSuccess, onError } = this.createMqttCallbacks(responseTopic, mqttOptions)

                        // check that the mcpServer contains the required fields to process the request
                        if (!mcpServer || !['instance', 'device'].includes(mcpServer.instanceType) || !mcpServer.instance || !mcpServer.mcpServer) {
                            console.warn('Invalid Expert Insight tool call request', payload)
                            return // do not respond, this is not for us.
                        }

                        // validate kind matches the topic channel parameter & that the toolDefinition/resourceDefinition/resourceTemplateDefinition is present
                        let definition = null
                        switch (true) {
                        case isInsightsToolCall && kind === 'mcp_tool':
                            definition = toolDefinition
                            break
                        case isInsightsResourceCall && kind === 'mcp_resource':
                            definition = resourceDefinition
                            break
                        case isInsightsResourceCall && kind === 'mcp_resource_template':
                            definition = resourceTemplateDefinition
                            break
                        }
                        if (!definition) {
                            onError('Invalid Expert Insight tool call request: missing or mismatched kind and definition', 'MCP_INVALID_DEFINITION')
                            return
                        }

                        this.emit(
                            `request/${mcpServer.instanceType}/expert/insight`, // event name
                            userId, // ID of user making the request
                            command, // command
                            mcpServer, // mcp server details
                            kind, // mcp kind (mcp_tool, mcp_resource, mcp_resource_template)
                            definition, // mcpFeatureDefinition
                            data, // call data
                            onSuccess, // success callback
                            onError // failure callback
                        )
                    } else if (supportedPlatformAutomationCommands[channelCommand] && direction === 'request') {
                        // channel command is either 'mcp-get-features' or 'mcp-call-tool'
                        const responseTopic = `ff/v1/expert/${userId}/${sessionId}/platform/${channelCommand}/response`
                        const command = supportedPlatformAutomationCommands[channelCommand]
                        const data = payload.data || {}
                        const { onSuccess, onError } = this.createMqttCallbacks(responseTopic, mqttOptions)

                        this.emit(
                            'request/platform-automation:forge', // event name
                            {
                                userId, // ID of user making the request
                                command, // command,
                                data, // payload data
                                meta: payload.meta
                            },
                            onSuccess, // success callback
                            onError // failure callback
                        )
                    }
                } else if (ownerType === 'p') {
                    this.emit('status/project', {
                        id: ownerId,
                        status: message.toString()
                    })
                } else if (ownerType === 'd') {
                    if (messageType === 'status') {
                        this.emit('status/device', {
                            id: ownerId,
                            status: message.toString()
                        })
                    } else if (messageType === 'logs') {
                        if (topicParts[6] && topicParts[6] === 'heartbeat') {
                            const payload = message.toString()
                            if (payload === 'alive') {
                                // track frontends
                                this.emit('logs/heartbeat', {
                                    id: `${topicParts[2]}:${ownerId}`,
                                    timestamp: Date.now()
                                })
                            } else if (payload === 'leaving') {
                                this.emit('logs/disconnect', {
                                    id: `${topicParts[2]}:${ownerId}`
                                })
                            }
                        }
                    } else if (messageType === 'resources') {
                        if (topicParts[6] && topicParts[6] === 'heartbeat') {
                            const payload = message.toString()
                            if (payload === 'alive') {
                                // track frontends
                                this.emit('resources/heartbeat', {
                                    id: `${topicParts[2]}:${ownerId}`,
                                    timestamp: Date.now()
                                })
                            } else if (payload === 'leaving') {
                                this.emit('resources/disconnect', {
                                    id: `${topicParts[2]}:${ownerId}`
                                })
                            }
                        }
                    } else if (messageType === 'response') {
                        const response = {
                            id: ownerId,
                            message: message.toString()
                        }
                        this.emit('response/device', response)
                    }
                } else if (ownerType === 'sync') {
                    // settings updated by another instance
                    // check if message is from this instance
                    const payload = message.toString()
                    const jsonPayload = JSON.parse(payload)
                    if (jsonPayload.srcId !== this.platformId) {
                        this.app.settings.refresh(jsonPayload.key)
                    }
                } else if (ownerType === 'leader') {
                    const payload = message.toString()
                    const jsonPayload = JSON.parse(payload)
                    this.app.housekeeper.updateLeader(jsonPayload)
                }
            })
            this.client.subscribe([
                // Launcher status - shared subscription
                '$share/platform/ff/v1/+/l/+/status',
                // Device status - shared subscription
                '$share/platform/ff/v1/+/d/+/status',
                // Device response - not shared subscription
                'ff/v1/+/d/+/response/' + this.platformId,
                // Device logs heartbeat
                'ff/v1/+/d/+/logs/heartbeat',
                // Device response heartbeat
                'ff/v1/+/d/+/resources/heartbeat',
                // Platform sync messages
                'ff/v1/platform/sync',
                // Listen for Expert platform requests.
                // Uses a dedicated shared subscription group. The group name defines the set
                // of consumers that share the workload, so keeping Expert separate from the
                // "platform" group prevents unrelated features from sharing a consumer pool and
                // allows them to scale independently.
                '$share/expert/ff/v1/expert/+/+/platform/+/request'
            ])
        }
    }

    /**
     * Creates onSuccess/onError callbacks that publish results back to the agent
     * over the given MQTT response topic.
     */
    createMqttCallbacks (responseTopic, mqttOptions) {
        const onError = (content, code, error) => {
            const data = {
                code: code || error?.code || 'MCP_ERROR',
                content: `Error: ${content}`,
                isError: true
            }
            if (error) {
                data.type = error?.name || error?.constructor?.name || 'Error'
                data.message = error?.message || error?.toString()
            }
            this.client.publish(responseTopic, JSON.stringify(data), mqttOptions)
        }
        const onSuccess = (result) => {
            this.client.publish(responseTopic, JSON.stringify(result), mqttOptions)
        }
        return { onSuccess, onError }
    }

    /**
     * Publish to a topic
     * @param {string} topic Topic to publish to
     * @param {*} payload the payload to publish
     * @param {mqtt.IClientPublishOptions} [options] publish options (optional)
     * @param {mqtt.PacketCallback} [callback] callback to call when the publish is complete (optional)
     * @returns {void}
     */
    publish (topic, payload, options, callback) {
        if (typeof options === 'function') {
            callback = options
            options = {}
        }
        if (this.client) {
            this.client.publish(topic, payload, options, (error, packet) => {
                if (callback) {
                    callback(error, packet)
                }
            })
        }
    }

    async disconnect () {
        if (this.client) {
            this.client.end()
        }
    }
}

module.exports = {
    CommsClient
}
