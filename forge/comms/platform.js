// /**
//  * This module provides the handler for instance events
//  */

const { z } = require('zod')

const automationTools = require('../ee/lib/mcp/tools/applications.js')
/**
 * PlatformCommsHandler
 * @class PlatformCommsHandler
 * @memberof forge.comms
 */
class PlatformCommsHandler {
    /**
     * New PlatformCommsHandler instance
     * @param {import('../forge.js').ForgeApplication} app Fastify app
     * @param {import('./commsClient.js').CommsClient} client Comms Client
     */
    constructor (app, client) {
        this.app = app
        this.client = client

        client.on('request/platform/expert/get-features', async (userId, onSuccess, onError) => {
            try {
                // TODO: Recommend filtering features based on user access (e.g. viewers should not even know about the existence of certain features).
                // TODO: Consider filtering features based on user team membership, etc.
                // For now, return all features.
                const tools = automationTools.map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    annotations: tool.annotations,
                    inputSchema: z.toJSONSchema(z.object(tool.inputSchema))
                }))
                onSuccess({ tools })
            } catch (err) {
                return onError(`Error handling expert platform request: ${err.message}`, 'PLATFORM_REQUEST_ERROR', err)
            }
        })

        client.on('request/platform/expert/call-tool', async (userId, toolDefinition, data, onSuccess, onError) => {
            try {
                const { name, input } = data
                const tool = automationTools.find(tool => tool.name === toolDefinition.name)
                // TODO: Check user access to the tool (e.g. team membership, roles, etc.) ? maybe ? maybe not since we call the http endpoint which will do the access check anyway!
                // TODO: Consider Validating input against tool.inputSchema using zod
                if (!tool || tool.name !== toolDefinition.name || tool.name !== name) {
                    return onError(`Tool '${toolDefinition.name}' not found`, 'PLATFORM_TOOL_NOT_FOUND')
                }

                // TODO: Consider verifying the toolDefinition matches the tool to ensure no tampering has occurred
                if (!true) {
                    return onError('Tool mismatch - agent should call get-features', 'PLATFORM_TOOL_MISMATCH')
                }

                const inject = (request) => {
                    // Inject the userId into the request headers for authentication/authorization purposes
                    request.headers = request.headers || {}
                    request.headers['x-user-id'] = userId
                    const pat = 'ffpat_ZBV9KFNs0QnCfB1TVGFFpcSJ-IZ1QpxyQq5lTdDpjTs'
                    request.headers.authorization = `Bearer ${pat}`
                    const appInject = this.app.inject.bind(this.app)
                    return appInject(request)
                }
                const result = await tool.handler(input, { inject })
                onSuccess(result.json())
            } catch (err) {
                return onError(`Error handling expert platform request: ${err.message}`, 'PLATFORM_REQUEST_ERROR', err)
            }
        })
    }
}

module.exports = {
    PlatformCommsHandler: (app, client) => new PlatformCommsHandler(app, client)
}
