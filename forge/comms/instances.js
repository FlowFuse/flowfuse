// /**
//  * This module provides the handler for instance events
//  */

const { filterAccessibleMCPServerFeatures } = require('../services/expert.js')

/**
 * InstanceCommsHandler
 * @class InstanceCommsHandler
 * @memberof forge.comms
 */
class InstanceCommsHandler {
    /**
     * New InstanceCommsHandler instance
     * @param {import('../forge').ForgeApplication} app Fastify app
     * @param {import('./commsClient').CommsClient} client Comms Client
     */
    constructor (app, client) {
        this.app = app
        this.client = client

        client.on('request/instance/expert/insight', async (userId, command, /** @type {MCPServerDetails} */ mcpServer, mcpDefinitionKind, mcpDefinition, data, onSuccess, onError) => {
            // MCP ROUTE: step 2 (hosted)
            // Called By: an MQTT inflight message (from the Expert Agent)
            // Calls To : driver helper fn callMCPTool (via the forge app container wrapper)

            const { team: teamId, application: applicationId, instance: instanceId, instanceType, mcpServer: mcpServerId } = mcpServer
            const isToolCall = command === 'mcp:call-tool'
            const isResourceCall = command === 'mcp:read-resource' && mcpDefinitionKind === 'mcp_resource'
            const isResourceTemplateCall = command === 'mcp:read-resource' && mcpDefinitionKind === 'mcp_resource_template'
            const toolDefinition = isToolCall ? mcpDefinition : null
            const resourceDefinition = isResourceCall ? mcpDefinition : null
            const resourceTemplateDefinition = isResourceTemplateCall ? mcpDefinition : null

            try {
                // Premise:
                // The incoming request contains information to call an MCP tool on a specific instance.
                // 1. Check that the for the MCP server supplied, the user has access (application level)
                // 2. Check that the for the MCP server feature being performed (prompt/resource/tool), that the user has access to (feature level)
                // 3. Re-resolve the MCP server against the team's trusted MCP registry, verify
                //    instance/application ownership, and get/create access tokens as needed based on the
                //    instance node security settings

                // first pass - basic sanity checks, picking up associated models for the user, team membership, etc
                if (!teamId || !applicationId || !instanceId || !mcpServerId || instanceType !== 'instance') {
                    return onError('Invalid MCP request - missing required fields', 'MCP_INVALID_REQUEST')
                }

                if (typeof instanceId !== 'string') {
                    return onError('Invalid instance ID', 'MCP_INVALID_INSTANCE_ID')
                }

                const instance = await this.app.db.models.Project.byId(instanceId)
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

                // Prepare command data and method based on the type of MCP call (tool, resource, or resource template)
                let commandMethod
                const commandData = []
                if (isToolCall) {
                    const accessibleTool = accessibleServer.tools.find(t => t.name === data.name)
                    if (!accessibleTool) {
                        return onError('User does not have access to MCP tool', 'MCP_NO_ACCESS_TOOL')
                    }
                    commandData.push(data.name)
                    commandData.push(data.input)
                    commandMethod = app.containers.callMCPTool
                } else if (isResourceCall) {
                    const accessibleResource = accessibleServer.resources.find(r => r.uri === resourceDefinition.uri)
                    if (!accessibleResource) {
                        return onError('User does not have access to MCP resource', 'MCP_NO_ACCESS_RESOURCE')
                    }
                    commandData.push(data.uri)
                    commandMethod = app.containers.readMCPResource
                } else if (isResourceTemplateCall) {
                    const accessibleResourceTemplate = accessibleServer.resourceTemplates.find(r => r.uriTemplate === resourceTemplateDefinition.uriTemplate)
                    if (!accessibleResourceTemplate) {
                        return onError('User does not have access to MCP resource template', 'MCP_NO_ACCESS_RESOURCE_TEMPLATE')
                    }
                    // Prepare the commandData for the resource template call, including resolving the final URI from the template and input values
                    // NOTE: The Expert Agent will typically unfurl the template and provide a fully resolved URI, but if it is not provided (or contains
                    // placeholders), we will compute it below using the template and input values
                    let uri = data.uri
                    if ((!uri || /\{([^}]+)\}/.test(uri))) {
                        // compute the final URI by replacing placeholders in the template with input values
                        const template = data.uriTemplate || uri
                        const input = data.input || {}
                        uri = template.replace(/\{([^}]+)\}/g, (match, key) => {
                            const cleanKey = key.replace(/[*?]/g, '') // strip RFC6570 modifiers e.g. {var*} or {var?} to get the clean key for input lookup
                            return input[cleanKey] !== undefined ? encodeURIComponent(input[cleanKey]) : match
                        })
                    }
                    commandData.push(uri)
                    commandMethod = app.containers.readMCPResource
                } else {
                    return onError('Invalid MCP command', 'MCP_INVALID_COMMAND')
                }

                // update the endpoint with the resolved access token for the instance and team
                const teamType = await instance.Team.getTeamType()
                const teamHttpSecurityFeature = !!teamType.properties.features?.teamHttpSecurity
                const endpoint = {
                    mcpEndpoint: mcpServer.mcpEndpoint,
                    headers: mcpServer.headers || {},
                    accessToken: await app.expert.mcp.getOrCreateToken(instance, mcpServer.instanceType, instanceId, teamHttpSecurityFeature) || null
                }

                try {
                    const result = await commandMethod(instance, endpoint, ...commandData)
                    onSuccess(result)
                } catch (err) {
                    return onError(`An error occurred performing insight request: ${err.message}`, 'MCP_INSIGHT_REQUEST_ERROR', err)
                }
            } catch (err) {
                return onError(`Error handling expert insights inflight request: ${err.message}`, 'MCP_INSIGHT_REQUEST_ERROR', err)
            }
        })
    }
}

module.exports = {
    InstanceCommsHandler: (app, client) => new InstanceCommsHandler(app, client)
}
