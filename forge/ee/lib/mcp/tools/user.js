const { basePagination, basePaginationKeys, appendQuery } = require('../schemas')

module.exports = [
    {
        name: 'platform_get_current_user',
        title: 'Get Current User',
        description: `FlowFuse platform automation tool:
            Gets the profile of the authenticated user: name, username, email, and default team.
            Use this to find out who the current user is or what their default team is.
            No parameters or body required.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/user' })
            return response
        }
    },
    {
        name: 'platform_list_notifications',
        title: 'List Notifications',
        description: `FlowFuse platform automation tool:
            Lists the authenticated user's own notifications, with pagination.
            Use this to check for unread alerts or recent activity addressed to the current user.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: { ...basePagination },
        handler: async (args, { inject }) => {
            const url = appendQuery('/api/v1/user/notifications', args, basePaginationKeys)
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_list_own_invitations',
        title: 'List Own Team Invitations',
        description: `FlowFuse platform automation tool:
            Lists the team invitations the authenticated user has received but not yet accepted or rejected.
            Use this to check whether the current user has any pending invitations to join a team.
            No parameters or body required.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/user/invitations' })
            return response
        }
    }
]
