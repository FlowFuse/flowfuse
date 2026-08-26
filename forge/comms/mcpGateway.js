const { SendMqttMessageAwaitReply } = require('./utils/sendMqttMessageAwaitReply')

const DEFAULT_TIMEOUT = 30000

/**
 * MCP Gateway communication handler.
 *
 * Proxies third-party MCP requests to the central MCP Gateway over MQTT,
 * using SendMqttMessageAwaitReply for MQTT v5 request/response correlation.
 *
 * @class McpGatewayHandler
 * @memberof forge.comms
 */
class McpGatewayHandler {
    /**
     * @param {import('../forge').ForgeApplication} app
     * @param {import('./commsClient').CommsClient} client
     */
    constructor (app, client) {
        this.app = app
        this.client = client
        this.awaitReply = new SendMqttMessageAwaitReply({ timeout: DEFAULT_TIMEOUT })

        client.on('response/mcp-gateway', (correlationData, payload) => {
            this.awaitReply.resolve(correlationData, payload)
        })
    }

    /**
     * Proxy an MCP request to the gateway and await the response.
     *
     * @param {{userId: string, mcpSessionId: string}} route Topic routing parts
     * @param {object} payload Request payload (mcp body, scope, toolGroups)
     * @param {number} [timeoutMs] Override default timeout
     * @param {object} [userProperties] Extra MQTT v5 user properties to attach to the request
     *   (e.g. the active browser session id), for the gateway to read on the other side.
     * @returns {Promise<object>} The MCP response body
     */
    async proxyRequest (route, payload, timeoutMs, userProperties) {
        const { userId, mcpSessionId } = route
        const requestTopic = `ff/v1/mcp/${this.client.platformId}/${userId}/${mcpSessionId}/request`

        const { correlationData, mqttOptions, promise } = this.awaitReply.create({
            timeout: timeoutMs || DEFAULT_TIMEOUT
        })

        if (userProperties && Object.keys(userProperties).length > 0) {
            mqttOptions.properties.userProperties = userProperties
        }

        this.client.publish(
            requestTopic,
            JSON.stringify({ ...payload, correlationData }),
            mqttOptions
        )

        const response = await promise
        return response.mcp || response
    }
}

module.exports = {
    McpGatewayHandler: (app, client) => new McpGatewayHandler(app, client)
}
