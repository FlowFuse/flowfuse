const { z } = require('zod')

const { basePagination, basePaginationKeys, appendQuery, teamId, toolError } = require('../schemas')

module.exports = [
    {
        name: 'platform_list_notifications',
        title: 'List Notifications',
        description: `FlowFuse platform automation tool:
            Lists the authenticated user's own notifications, with pagination.
            Use this to check for unread alerts or recent activity addressed to the current user.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
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
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/user/invitations' })
            return response
        }
    },
    {
        name: 'platform_set_notification_read_state',
        title: 'Set Notification Read State',
        description: `FlowFuse platform automation tool:
            Marks the current user's notifications as read or unread. Provide notificationId to change one notification, or ids to change several in one call - exactly one of the two.
            There is no "mark all" shortcut: bulk changes need an explicit list of ids, so list them first with platform_list_notifications. Unknown ids in a bulk call are silently skipped; a wrong single notificationId returns a 404.
            The single-notification call replies { status: "okay" }; the bulk call replies with the refreshed notification list.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            notificationId: z.string().optional().describe('The hashid of a single notification to change. Provide exactly one of notificationId or ids'),
            ids: z.array(z.string()).optional().describe('Hashids of the notifications to change in bulk. Provide exactly one of notificationId or ids'),
            read: z.boolean().describe('Read state to set: true marks read, false marks unread')
        },
        handler: async (args, { inject }) => {
            const hasSingle = args.notificationId !== undefined
            const hasBulk = args.ids !== undefined
            if (hasSingle === hasBulk) {
                return toolError(400, 'invalid_request', 'Provide exactly one of notificationId or ids')
            }
            if (hasSingle) {
                const response = await inject({ method: 'PUT', url: `/api/v1/user/notifications/${args.notificationId}`, payload: { read: args.read } })
                return response
            }
            const response = await inject({ method: 'PUT', url: '/api/v1/user/notifications', payload: { ids: args.ids, read: args.read } })
            return response
        }
    },
    {
        name: 'platform_respond_to_team_invitation',
        title: 'Respond to Team Invitation',
        description: `FlowFuse platform automation tool:
            Accepts or rejects a team invitation the current user has received. Accepting joins the team with the invited role; rejecting declines and removes the invitation.
            Only invitations addressed to the current user can be answered - anything else returns a 404. Find pending invitations with platform_list_own_invitations.
            This is the counterpart to platform_invite_team_member (which sends invitations) and cannot revoke invitations sent to other people.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            invitationId: z.string().describe('The hashid of an invitation the current user received, as returned by platform_list_own_invitations'),
            action: z.enum(['accept', 'reject']).describe('Whether to accept the invitation (join the team) or reject it (decline)')
        },
        handler: async (args, { inject }) => {
            const method = args.action === 'accept' ? 'PATCH' : 'DELETE'
            const response = await inject({ method, url: `/api/v1/user/invitations/${args.invitationId}` })
            return response
        }
    },
    {
        name: 'platform_update_profile',
        title: 'Update Own Profile',
        description: `FlowFuse platform automation tool:
            Updates the current user's own profile. Only the display name and default team are editable through this tool; username, email, password and other account settings are deliberately not exposed.
            Only the fields you pass are changed. Passing an empty name resets the display name to the username. defaultTeam must be a team the user is a member of, otherwise the call fails with "invalid_team".
            The default team is the one the platform UI opens on login.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            name: z.string().optional().describe('New display name for the current user. An empty string resets it to the username'),
            defaultTeam: teamId.optional().describe('The hashid of the team to open by default. Must be a team the current user belongs to')
        },
        handler: async (args, { inject }) => {
            const payload = {}
            if (args.name !== undefined) {
                payload.name = args.name
            }
            if (args.defaultTeam !== undefined) {
                payload.defaultTeam = args.defaultTeam
            }
            const response = await inject({ method: 'PUT', url: '/api/v1/user', payload })
            return response
        }
    }
]
