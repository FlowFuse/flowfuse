const { z } = require('zod')

const { appendQuery, applicationId, basePagination, basePaginationKeys, searchQuery, searchQueryKeys, teamId } = require('../schemas')

module.exports = [
    {
        name: 'platform_list_application_device_groups',
        title: 'List Application Device Groups',
        description: `FlowFuse platform automation tool:
            Lists the device groups belonging to an application.
            Device groups are used to organize remote instances (devices) for fleet-style deployments,
            so multiple devices can share the same target snapshot and settings.
            Requires the deviceGroups feature to be enabled for the owning team; if it is not enabled,
            this returns a descriptive "device groups not enabled for this team" error.
            Use platform_get_application_device_group to fetch the full detail of a single group.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            applicationId,
            ...basePagination,
            ...searchQuery
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/applications/${args.applicationId}/device-groups`, args, [...basePaginationKeys, ...searchQueryKeys])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_get_application_device_group',
        title: 'Get Application Device Group',
        description: `FlowFuse platform automation tool:
            Fetches a single device group in an application, including its members and target snapshot.
            Requires the deviceGroups feature to be enabled for the owning team; if it is not enabled,
            this returns a descriptive "device groups not enabled for this team" error.
            If you need to find the group ID first, call platform_list_application_device_groups.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            applicationId,
            groupId: z.string().describe('Device group hashid to fetch')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/applications/${args.applicationId}/device-groups/${args.groupId}` })
            return response
        }
    },
    {
        name: 'platform_list_team_device_groups',
        title: 'List Team Device Groups',
        description: `FlowFuse platform automation tool:
            Lists the device groups across all applications in a team.
            Requires the deviceGroups feature to be enabled for the team; if it is not enabled,
            this returns a descriptive "device groups not enabled for this team" error.
            Results are filtered to the applications you can access for non-admins, so a scoped
            token sees only its in-scope subset rather than an error.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            ...basePagination,
            ...searchQuery
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/device-groups`, args, [...basePaginationKeys, ...searchQueryKeys])
            const response = await inject({ method: 'GET', url })
            return response
        }
    }
]
