/**
 * Filter MCP server features based on user access permissions for the owner application.
 * If a user does not have access to a specific feature (e.g. a tool with destructive hint), it is removed from the server's feature list.
 * If a server has no accessible features after filtering, it is removed from the list.
 * @param {ForgeApplication} app
 * @param {Array<{server: object, application: import('sequelize').Model, applicationId: string, instanceId: string}>} serverList
 * @param {import('sequelize').Model} team
 * @param {import('sequelize').Model} teamMembership
 * @returns {MCPServerItem[]}
 */
module.exports.filterAccessibleMCPServerFeatures = function (app, serverList, team, teamMembership) {
    const servers = []
    for (const serverDetails of serverList) {
        const { server, application } = serverDetails
        const permissionContext = { application }

        // sanity checks
        if (!application) {
            continue // not expected, but just in case
        }
        if (team.id !== application.TeamId || team.hashid !== server.team) {
            continue
        }

        // first pass - is the user allowed access to this MCP server at all?
        if (!app.hasPermission(teamMembership, 'expert:insights:mcp:allow', { application })) {
            continue // user doesn't have access to this instance
        }

        // NOTE: prompts are not yet implemented in the expert backend
        // const defaultPromptPermission = app.hasPermission(teamMembership, 'expert:insights:mcp:prompt:allow', permissionContext)
        const defaultResourcePermission = app.hasPermission(teamMembership, 'expert:insights:mcp:resource:allow', permissionContext)
        const defaultResourceTemplatePermission = app.hasPermission(teamMembership, 'expert:insights:mcp:resourcetemplate:allow', permissionContext)
        const defaultToolPermission = app.hasPermission(teamMembership, 'expert:insights:mcp:tool:allow', permissionContext)
        const allowToolWrite = app.hasPermission(teamMembership, 'expert:insights:mcp:tool:write', permissionContext)
        const allowToolDestructive = app.hasPermission(teamMembership, 'expert:insights:mcp:tool:destructive', permissionContext)
        const allowToolOpenWorld = app.hasPermission(teamMembership, 'expert:insights:mcp:tool:open-world', permissionContext)
        const allowToolNonIdempotent = app.hasPermission(teamMembership, 'expert:insights:mcp:tool:non-idempotent', permissionContext)

        const result = { ...server }

        if (result.resources && Array.isArray(result.resources)) {
            result.resources = result.resources?.filter(_resource => {
                return defaultResourcePermission
            })
        }

        if (result.resourceTemplates && Array.isArray(result.resourceTemplates)) {
            result.resourceTemplates = result.resourceTemplates.filter(_resourceTemplate => {
                return defaultResourceTemplatePermission
            })
        }

        if (result.tools && Array.isArray(result.tools)) {
            result.tools = result.tools.filter(tool => {
                if (defaultToolPermission !== true) {
                    return false
                }
                // at this point, we have established the user has general tool access - now filter based on annotations/hints
                const isReadonly = tool.annotations?.readOnlyHint === true
                const isDestructive = tool.annotations?.destructiveHint !== false // air on side of caution - if not specified, assume destructive
                const isOpenWorld = tool.annotations?.openWorldHint === true
                const isIdempotent = tool.annotations?.idempotentHint === true
                const writeAccessRequired = isDestructive === true || isReadonly === false

                // Sanity check combinations
                if (isReadonly && isDestructive) {
                    // this is not a valid combination - destructive tools cannot be read-only
                    return false
                }

                // test access based on hints - worst to best
                if (writeAccessRequired) {
                    if (isDestructive === true) {
                        if (!allowToolDestructive) {
                            return false
                        }
                    }
                    if (isReadonly === false) {
                        if (!allowToolWrite) {
                            return false
                        }
                    }
                    if (isIdempotent === false) {
                        if (!allowToolNonIdempotent) {
                            return false
                        }
                    }
                }
                if (isOpenWorld === true) {
                    if (!allowToolOpenWorld) {
                        return false
                    }
                }
                return true
            })
        }
        servers.push(result)
    }

    // finally, before sending the response, filter out any servers that have no accessible features
    return servers.filter(server => {
        const hasPrompts = Array.isArray(server.prompts) && server.prompts.length > 0
        const hasResources = Array.isArray(server.resources) && server.resources.length > 0
        const hasResourceTemplates = Array.isArray(server.resourceTemplates) && server.resourceTemplates.length > 0
        const hasTools = Array.isArray(server.tools) && server.tools.length > 0
        return hasPrompts || hasResources || hasResourceTemplates || hasTools
    })
}
