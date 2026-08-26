module.exports = [
    {
        name: 'platform_get_active_user',
        title: 'Get Active User',
        description: `FlowFuse platform automation tool:
            Get the profile of the user this MCP session is authenticated as, along with what the session's token is allowed to do.
            Returns the user's ID (hashid), username, name, email and admin flag, plus a token object:
            token.readOnly - when true, write and delete tools are rejected, so only read tools can be used.
            token.allTeams - when true, the token is not restricted to a subset of teams and every team the user belongs to is in reach.
            token.teams - when allTeams is false, the IDs of the only teams the token may act on. Calls against any other team will fail.
            Use this to resolve the current user's ID before calling tools that need a userId, such as listing browser sessions,
            and to check up front whether an action the user asked for is within the session's access.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject, scope }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/user' })
            if (response.statusCode >= 400) {
                return response
            }

            // No scope means the tool was not called through a scoped token (the FlowFuse
            // Expert path), so the session has the user's full access.
            const teams = Array.isArray(scope?.teams) ? scope.teams : []
            return {
                ...response.json(),
                token: {
                    readOnly: scope?.readOnly === true,
                    allTeams: teams.length === 0,
                    teams
                }
            }
        }
    }
]
