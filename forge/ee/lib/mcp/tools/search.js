const { z } = require('zod')

const { teamId, appendQuery } = require('../schemas')

module.exports = [
    {
        name: 'platform_search_team_resources',
        title: 'Search Team Resources',
        description: `FlowFuse platform automation tool:
            Searches across a team's resources: applications, hosted instances, and remote instances (devices).
            Use this when the user wants to find something by name across the whole team, or when you have a name
            but not the ID of the resource you need.
            An empty or blank query returns an empty result set.
            To search only instances (hosted and remote), use platform_search_instances instead.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            query: z.string().describe('The search term')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery('/api/v1/search', { team: args.teamId, query: args.query }, ['team', 'query'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_search_instances',
        title: 'Search Instances',
        description: `FlowFuse platform automation tool:
            Searches the hosted instances and remote instances (devices) of a team.
            Use this when the user wants to find an instance by name and you do not already have its ID.
            An empty or blank query returns an empty result set.
            To search across all resource types (including applications), use platform_search_team_resources instead.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            query: z.string().describe('The search term')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery('/api/v1/search/instances', { team: args.teamId, query: args.query }, ['team', 'query'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    }
]
