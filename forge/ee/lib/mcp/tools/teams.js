const { z } = require('zod')

const { teamId, basePagination, basePaginationKeys, searchQuery, searchQueryKeys, auditLogFilters, auditLogFilterKeys, appendQuery, toolError } = require('../schemas')

// Audit-log routes accept cursor+limit pagination, free-text query, event
// (single name or array) and username. scope narrows which entity levels are
// returned; includeChildren pulls in descendant entries within the chosen scope.
const includeChildren = z.boolean().optional().describe('Also include audit entries from child entities within the chosen scope')
const auditLogInput = { ...basePagination, ...searchQuery, ...auditLogFilters }
const auditLogKeys = [...basePaginationKeys, ...searchQueryKeys, ...auditLogFilterKeys]

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
        description: `FlowFuse platform automation tool:
            Get details of a specific team, identified by either its hashid (teamId) or its URL slug (teamSlug). Provide exactly one of the two.
            Includes team type, member count, and hosted and remote instance counts.
            The embedded team type carries a long description field holding the raw HTML used to render the plan's
            feature list in the UI. It is presentation markup, not data: ignore it, and read plan limits from
            type.properties instead.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().optional().describe('Team hashid. Provide either teamId or teamSlug, not both.'),
            teamSlug: z.string().regex(/^[a-z0-9-_]+$/i).optional().describe('Team slug (URL identifier; lowercase letters, digits, hyphen and underscore). Provide either teamId or teamSlug, not both.')
        },
        handler: async (args, { inject }) => {
            const hasId = !!args.teamId
            const hasSlug = !!args.teamSlug
            if (hasId === hasSlug) {
                return toolError(400, 'invalid_request', 'Provide exactly one of teamId or teamSlug')
            }
            const url = hasId
                ? `/api/v1/teams/${args.teamId}`
                : `/api/v1/teams/slug/${args.teamSlug}`
            const response = await inject({ method: 'GET', url })
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
        name: 'platform_get_team_membership',
        title: 'Get Team Membership',
        description: `FlowFuse platform automation tool:
            Gets the authenticated user's own membership (role) in a team.
            Use this to check what role the current user holds in a team before attempting an action that needs a specific role.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/user` })
            return response
        }
    },
    {
        name: 'platform_list_team_members',
        title: 'List Team Members',
        description: `FlowFuse platform automation tool:
            Lists the members of a team, including their role and, when SSO is enabled, whether their membership is SSO-managed.
            Use this to see who belongs to a team before inviting, removing, or changing the role of a member.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/members` })
            return response
        }
    },
    {
        name: 'platform_list_team_invitations',
        title: 'List Team Invitations',
        description: `FlowFuse platform automation tool:
            Lists the pending invitations for a team.
            This requires the Owner role, so a non-Owner credential will get an access error even though this tool itself is read-only.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/invitations` })
            return response
        }
    },
    {
        name: 'platform_get_team_audit_log',
        title: 'Get Team Audit Log',
        description: `FlowFuse platform automation tool:
            Reads the audit log for a team. By default it returns only team-level events (membership changes,
            billing changes, and other team administrative actions). To also include events from the team's
            applications, instances, and devices, set includeChildren or set scope to that entity level.
            A team-scoped PAT only sees audit log entries for teams it is scoped to.
            Use this when the user asks what happened on a team, or wants to investigate recent changes.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            ...auditLogInput,
            scope: z.enum(['team', 'application', 'project', 'device']).optional().describe('Entity level to include (default team)'),
            includeChildren
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/audit-log`, args, [...auditLogKeys, 'scope', 'includeChildren'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_list_team_npm_packages',
        title: 'List Team NPM Packages',
        description: `FlowFuse platform automation tool:
            Lists the private npm packages owned by a team.
            The npm registry is a plan-gated feature; if it is not enabled for the team's plan, or the team does not exist, the underlying API's error response is returned as-is.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/npm/packages` })
            return response
        }
    },
    {
        name: 'platform_list_team_git_tokens',
        title: 'List Team Git Tokens',
        description: `FlowFuse platform automation tool:
            Lists the git tokens configured for a team. The response never includes the raw stored personal access token, only its ID, name, and type.
            Git integration is a plan-gated feature; if it is not enabled for the team's plan, or the team does not exist, the underlying API's error response is returned as-is.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/git/tokens` })
            return response
        }
    }
]
