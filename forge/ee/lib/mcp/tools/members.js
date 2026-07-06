const { teamId } = require('../schemas')

module.exports = [
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
    }
]
