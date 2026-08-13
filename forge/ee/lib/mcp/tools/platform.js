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
    }
]
