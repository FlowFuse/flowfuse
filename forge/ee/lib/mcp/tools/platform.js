const { z } = require('zod')

const { basePagination, basePaginationKeys, searchQuery, searchQueryKeys, appendQuery } = require('../schemas')

module.exports = [
    {
        name: 'platform_list_hosted_instance_types',
        title: 'List Hosted Instance Types',
        description: 'FlowFuse platform automation tool: List all available hosted instance types. Use this to find valid projectType values when creating a hosted instance. Supports name search, active-state filtering and pagination.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            ...basePagination,
            ...searchQuery,
            filter: z.enum(['all', 'active', 'inactive']).optional().describe('Which types to include by active state (default active only)')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery('/api/v1/project-types', args, [...basePaginationKeys, 'query', 'filter'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_list_stacks',
        title: 'List Stacks',
        description: 'FlowFuse platform automation tool: List all available stacks (Node-RED versions). Use this to find valid stack values when creating a hosted instance. Supports name search, filtering and pagination.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            ...basePagination,
            ...searchQuery,
            filter: z.string().optional().describe('Filter by active state ("all", "active", "inactive") or by replacement ("replacedBy:<stackId>")'),
            projectType: z.string().optional().describe('Only return stacks for this hosted instance type (project-type hashid)')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery('/api/v1/stacks', args, [...basePaginationKeys, 'query', 'filter', 'projectType'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_list_templates',
        title: 'List Templates',
        description: 'FlowFuse platform automation tool: List all available templates. When creating a hosted instance, if only one template exists, use it automatically. If multiple templates exist, ask the user which one to use. Supports name search and pagination.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            ...basePagination,
            ...searchQuery
        },
        handler: async (args, { inject }) => {
            const url = appendQuery('/api/v1/templates', args, [...basePaginationKeys, 'query'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_list_blueprints',
        title: 'List Blueprints',
        description: 'FlowFuse platform automation tool: List all available flow blueprints. Blueprints provide starter flows that can be used when creating a new hosted instance. Supports name search, active-state filtering and pagination.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            ...basePagination,
            ...searchQuery,
            filter: z.enum(['all', 'active', 'inactive']).optional().describe('Which blueprints to include by active state (default active only)'),
            team: z.string().optional().describe('Team hashid to also include blueprints specific to that team')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery('/api/v1/flow-blueprints', args, [...basePaginationKeys, 'query', 'filter', 'team'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_get_hosted_instance_type',
        title: 'Get Hosted Instance Type',
        description: 'Get a single hosted instance type (project type) by id.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            instanceTypeId: z.string().describe('Project-type hashid identifying the hosted instance type')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/project-types/${args.instanceTypeId}` })
            return response
        }
    },
    {
        name: 'platform_get_stack',
        title: 'Get Stack',
        description: 'Get a single stack by id.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            stackId: z.string().describe('Stack hashid')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/stacks/${args.stackId}` })
            return response
        }
    },
    {
        name: 'platform_get_template',
        title: 'Get Template',
        description: 'Get a single template by id. Env values are blanked in the response.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            templateId: z.string().describe('Template hashid')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/templates/${args.templateId}` })
            return response
        }
    },
    {
        name: 'platform_get_blueprint',
        title: 'Get Blueprint',
        description: 'Get a single flow blueprint by id.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            flowBlueprintId: z.string().describe('Flow blueprint hashid')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/flow-blueprints/${args.flowBlueprintId}` })
            return response
        }
    },
    {
        name: 'platform_list_team_types',
        title: 'List Team Types',
        description: `FlowFuse platform automation tool:
            Lists the team types (tiers/plans) available on the platform, with name search, active-state filtering and pagination.
            Use this to see what team types exist before creating a team or to look up a team's current type.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            ...basePagination,
            ...searchQuery,
            filter: z.enum(['all', 'active', 'inactive']).optional().describe('Which team types to include by active state (default active only)')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery('/api/v1/team-types', args, [...basePaginationKeys, ...searchQueryKeys, 'filter'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_get_team_type',
        title: 'Get Team Type',
        description: `FlowFuse platform automation tool:
            Gets the details of a single team type by its hashid.
            Use this to inspect the tier/plan a team is on, or to check a team type before assigning it to a new team.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamTypeId: z.string().describe('Team type hashid')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/team-types/${args.teamTypeId}` })
            return response
        }
    }
]
