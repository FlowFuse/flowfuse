const { z } = require('zod')

function getProperty (properties, key) {
    let value = properties
    for (const part of key.split('.')) {
        if (value === undefined || value === null || !Object.hasOwn(value, part)) {
            return undefined
        }
        value = value[part]
    }
    return value
}

function getTeamProperty (team, key, defaultValue) {
    const teamValue = getProperty(team.properties, key)
    if (teamValue !== undefined) {
        return teamValue
    }
    const teamTypeValue = getProperty(team.type?.properties, key)
    return teamTypeValue !== undefined ? teamTypeValue : defaultValue
}

module.exports = [
    {
        name: 'platform_list_hosted_instance_types',
        title: 'List Hosted Instance Types',
        description: `FlowFuse platform automation tool:
            Lists the hosted instance types available to a team, each with its stacks (Node-RED versions) nested inside.
            Use this to find valid projectType and stack values when creating a hosted instance.
            Each type is flagged available (allowed for the team's plan) and creatable (the team can create a new instance of this type right now, within its limits).
            By default only creatable types are returned - pass creatableOnly: false to also see types the team cannot currently create.
            Pass projectType to look up one specific instance type and only see its stacks.
            Each type includes a defaultStack, which is the recommended (latest) stack for that type.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().describe('The ID or hashid of the team to check instance type availability for'),
            projectType: z.string().optional().describe('Optional ID of one hosted instance type to look up, to only return that type and its stacks'),
            creatableOnly: z.boolean().default(true).optional().describe('Whether to only include instance types the team can currently create. Defaults to true.')
        },
        handler: async (args, { inject }) => {
            const teamResponse = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}` })
            if (teamResponse.statusCode >= 400) {
                return { content: teamResponse.json(), code: teamResponse.statusCode, isError: true }
            }
            const team = teamResponse.json()

            const typesResponse = await inject({ method: 'GET', url: '/api/v1/project-types' })
            if (typesResponse.statusCode >= 400) {
                return { content: typesResponse.json(), code: typesResponse.statusCode, isError: true }
            }

            let types = typesResponse.json().types
            if (args.projectType) {
                types = types.filter(type => type.id === args.projectType)
            }

            const creatableOnly = args.creatableOnly !== false
            const decoratedTypes = []
            for (const type of types) {
                const available = getTeamProperty(team, `instances.${type.id}.active`, false)
                const creatableForTeam = getTeamProperty(team, `instances.${type.id}.creatable`, true)
                const limit = getTeamProperty(team, `instances.${type.id}.limit`, null)
                const existingCount = team.instanceCountByType?.[type.id] || 0
                const withinLimit = limit === null || limit === undefined || limit < 0 || existingCount < limit
                const creatable = available && creatableForTeam && withinLimit

                if (creatableOnly && !creatable) {
                    continue
                }

                const stacksResponse = await inject({ method: 'GET', url: `/api/v1/stacks?projectType=${type.id}` })
                const stacks = stacksResponse.statusCode < 400 ? stacksResponse.json().stacks : []

                decoratedTypes.push({ ...type, available, creatable, stacks })
            }

            return { types: decoratedTypes }
        }
    },
    {
        name: 'platform_list_templates',
        title: 'List Templates',
        description: 'FlowFuse platform automation tool: List all available templates. When creating a hosted instance, if only one template exists, use it automatically. If multiple templates exist, ask the user which one to use.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/templates' })
            return response
        }
    },
    {
        name: 'platform_list_blueprints',
        title: 'List Blueprints',
        description: 'FlowFuse platform automation tool: List all available flow blueprints. Blueprints provide starter flows that can be used when creating a new hosted instance.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/flow-blueprints' })
            return response
        }
    },
    {
        name: 'platform_list_browser_sessions',
        title: 'List Browser Sessions',
        description: `FlowFuse platform automation tool:
            Lists the user's active browser sessions that have been exposed for third-party MCP access.
            Each session represents a browser tab where the user has enabled the MCP toggle.
            Use this to discover which tabs are available before invoking flow-building or UI tools that require a target browser session.
            The returned sessions include the tab's current context (what page the user is viewing, which team/instance/device is selected, editor state, and capabilities).
            Pick a session_id from the results and pass it as the target for subsequent tool invocations.
            If no sessions are returned, ask the user to open the FlowFuse platform in their browser and enable the MCP toggle (the plug icon next to the Expert button in the header).`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            userId: z.string().describe('The ID or hashid of the user whose browser sessions to list')
        },
        handler: async (args, { app }) => {
            if (!app?.comms?.browserSessions) {
                return {
                    sessions: [],
                    message: 'Browser sessions are not available on this platform. 3rd party automations like flow building will not be possible.'
                }
            }

            const sessions = await app.comms.browserSessions.getSessionsByUser(args.userId)

            if (sessions.length === 0) {
                const baseUrl = app.config.base_url || ''
                return {
                    sessions: [],
                    message: 'No active browser sessions found for this user. ' +
                        'Please let the user know they need to: ' +
                        `1. Open the [FlowFuse platform](${baseUrl}) in their browser.` +
                        '2. Click the MCP toggle button (plug icon next to the Expert button in the header). ' +
                        'Once enabled, the browser tab will appear in this list. ' +
                        'Share these instructions with the user and retry once they confirm the toggle is on.'
                }
            }

            return {
                sessions: sessions.map(session => ({
                    sessionId: session.sessionId,
                    userId: session.userId,
                    lastSeen: session.lastSeen,
                    visibility: session.visibility || 'unknown',
                    context: session.context || null
                }))
            }
        }
    }
]
