const { z } = require('zod')

const { teamId, basePagination, basePaginationKeys, limitParam, limitParamKeys, pageParam, pageParamKeys, searchQuery, searchQueryKeys, appendQuery } = require('../schemas')

module.exports = [
    {
        name: 'platform_list_teams',
        title: 'List Teams',
        description: 'FlowFuse platform automation tool: List all teams the authenticated user belongs to. Returns team names, slugs, IDs, and membership roles.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/user/teams' })
            return response
        }
    },
    {
        name: 'platform_get_team',
        title: 'Get Team',
        description: 'FlowFuse platform automation tool: Get details of a specific team by its ID, including team type, member count, hosted instance and remote instance counts.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}` })
            return response
        }
    },
    {
        name: 'platform_get_team_by_slug',
        title: 'Get Team By Slug',
        description: `FlowFuse platform automation tool:
            Gets details of a specific team using its slug (URL identifier) instead of its hashid.
            Use this when you only know the team's slug, for example from a URL, and need the same details as platform_get_team.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamSlug: z.string().regex(/^[a-z0-9-_]+$/i).describe('Team slug (URL identifier; lowercase letters, digits, hyphen and underscore)')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/slug/${args.teamSlug}` })
            return response
        }
    },
    {
        name: 'platform_list_team_projects',
        title: 'List Team Projects',
        description: `FlowFuse platform automation tool:
            Lists the hosted instances (projects) in a team, with optional name filtering, sorting, and pagination.
            Use this for a lighter-weight or differently sorted view of a team's hosted instances than looking up each application individually.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            query: z.string().optional().describe('Filter instances by name substring'),
            sort: z.enum(['name', 'createdAt', 'updatedAt', 'application.name', 'flowLastUpdatedAt']).optional().describe('Field to sort the instance list by'),
            dir: z.enum(['asc', 'desc']).optional().describe('Sort direction for the sort field'),
            includeMeta: z.boolean().optional().describe('Include instance settings and metadata in each row (default false)'),
            orderByMostRecentFlows: z.boolean().optional().describe('Order results by most recently updated flows (default false)'),
            ...limitParam,
            ...pageParam
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/projects`, args, [
                'query', 'sort', 'dir', 'includeMeta', 'orderByMostRecentFlows', ...limitParamKeys, ...pageParamKeys
            ])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_list_team_application_statuses',
        title: 'List Team Application Statuses',
        description: `FlowFuse platform automation tool:
            Lists the applications in a team along with the live status of their associated hosted instances and remote instances.
            Use this to get a status overview across an entire team without querying each application individually.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            associationsLimit: z.number().optional().describe('Maximum number of associated instances and devices to include per application')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/applications/status`, args, ['associationsLimit'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_list_team_dashboard_instances',
        title: 'List Team Dashboard Instances',
        description: `FlowFuse platform automation tool:
            Lists the hosted instances in a team that have the Node-RED dashboard module installed.
            Use this to find instances that expose a dashboard rather than checking every instance individually.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/dashboard-instances` })
            return response
        }
    },
    {
        name: 'platform_get_team_instance_counts',
        title: 'Get Team Instance Counts',
        description: `FlowFuse platform automation tool:
            Counts a team's instances of the given type, optionally narrowed by state and application.
            instanceType is required: use "hosted" for hosted instances or "remote" for remote instances (devices).
            Use this for quick totals instead of listing and counting every instance yourself.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            instanceType: z.enum(['remote', 'hosted']).describe('Instance type to count'),
            state: z.array(z.string()).optional().describe('Optional list of instance states to filter the counts by (defaults to empty)'),
            applicationId: z.string().optional().describe('Application hashid to scope the counts to a single application')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/instance-counts`, args, ['instanceType', 'state', 'applicationId'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_list_team_provisioning_tokens',
        title: 'List Team Provisioning Tokens',
        description: `FlowFuse platform automation tool:
            Lists a team's device provisioning tokens. This summary view omits the token secret.
            Use this to see what provisioning tokens exist for a team without exposing their secrets.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/devices/provisioning` })
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
    },
    {
        name: 'platform_check_team_slug_availability',
        title: 'Check Team Slug Availability',
        description: `FlowFuse platform automation tool:
            Checks whether a team slug is available before creating a team. This does not create or change anything.
            The value "create" is reserved and is always rejected.
            Use this before calling a team creation tool to make sure the chosen slug is not already taken.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            slug: z.string().regex(/^[a-z0-9-_]+$/i).describe('Team slug to check; lowercase letters, digits, hyphen and underscore')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'POST', url: '/api/v1/teams/check-slug', payload: { slug: args.slug } })
            return response
        }
    }
]
