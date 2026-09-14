const { z } = require('zod')

const { appendQuery, applicationId, basePagination, basePaginationKeys, searchQuery, searchQueryKeys, teamId } = require('../schemas')

module.exports = [
    {
        name: 'platform_list_team_device_groups',
        title: 'List Team Device Groups',
        description: `FlowFuse platform automation tool:
            Lists the device groups across all applications in a team.
            Device groups are used to organize remote instances (devices) for fleet-style deployments,
            so multiple devices can share the same target snapshot and settings.
            Each group includes the application it belongs to.
            Results are filtered to the applications you can access for non-admins, so a scoped token sees only its in-scope subset rather than an error.
            Requires the deviceGroups feature to be enabled for the team; if it is not, this returns a not-found error.
            To list the device groups of a single application, use platform_list_application_device_groups.
            Use platform_get_application_device_group to fetch the full detail of a single group.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
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
    },
    {
        name: 'platform_list_application_device_groups',
        title: 'List Application Device Groups',
        description: `FlowFuse platform automation tool:
            Lists the device groups belonging to a single application.
            Device groups are used to organize remote instances (devices) for fleet-style deployments,
            so multiple devices can share the same target snapshot and settings.
            Requires the deviceGroups feature to be enabled for the owning team; if it is not, this returns a not-found error.
            To list the device groups across a whole team, use platform_list_team_device_groups.
            Use platform_get_application_device_group to fetch the full detail of a single group.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
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
            Requires the deviceGroups feature to be enabled for the owning team; if it is not, this returns a not-found error.
            If you need to find the group ID first, call platform_list_application_device_groups or platform_list_team_device_groups.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
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
        name: 'platform_create_device_group',
        title: 'Create Device Group',
        description: `FlowFuse platform automation tool:
            Creates a new, empty device group in an application. Device groups organize remote instances (devices) for fleet-style deployments, so members share a target snapshot and environment variables.
            Add devices with platform_update_device_group_membership afterwards.
            Requires the deviceGroups feature to be enabled for the owning team; if it is not (or the application does not exist) this returns a not-found error.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            applicationId: applicationId.describe('The hashid of the application to create the device group in'),
            name: z.string().min(1).describe('Name for the new device group'),
            description: z.string().optional().describe('Optional description for the group')
        },
        handler: async (args, { inject }) => {
            const payload = { name: args.name }
            if (args.description !== undefined) {
                payload.description = args.description
            }
            const response = await inject({ method: 'POST', url: `/api/v1/applications/${args.applicationId}/device-groups`, payload })
            return response
        }
    },
    {
        name: 'platform_update_device_group',
        title: 'Update Device Group',
        description: `FlowFuse platform automation tool:
            Updates a device group's name, description, and/or pinned target snapshot. Only the fields you pass are changed; omitted fields keep their values. A successful update returns an empty object.
            CAUTION: targetSnapshotId takes effect immediately - pinning a snapshot applies it to every device in the group and tells them to deploy it, and passing null clears the pin (also clearing it from the member devices). Confirm with the user before changing it.
            The snapshot must belong to the same application as the group; anything else is rejected with a 400.
            Requires the deviceGroups feature to be enabled for the owning team; if it is not, this returns a not-found error.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            applicationId: applicationId.describe('The hashid of the application the group belongs to'),
            groupId: z.string().describe('The hashid of the device group to update'),
            name: z.string().min(1).optional().describe('New name for the group'),
            description: z.string().optional().describe('New description for the group'),
            targetSnapshotId: z.string().nullable().optional().describe('The hashid of the snapshot to pin as the group target (deployed to all member devices immediately), or null to clear the pin. The snapshot must belong to the same application')
        },
        handler: async (args, { inject }) => {
            const payload = {}
            for (const key of ['name', 'description', 'targetSnapshotId']) {
                if (args[key] !== undefined) {
                    payload[key] = args[key]
                }
            }
            const response = await inject({ method: 'PUT', url: `/api/v1/applications/${args.applicationId}/device-groups/${args.groupId}`, payload })
            return response
        }
    },
    {
        name: 'platform_update_device_group_membership',
        title: 'Update Device Group Membership',
        description: `FlowFuse platform automation tool:
            Changes which remote instances (devices) belong to a device group. Use add and/or remove for incremental changes, or set to replace the entire membership atomically (set overrides add/remove; a device in both add and remove ends up removed). A successful update returns an empty object.
            Devices must belong to the same application as the group, otherwise the whole call is rejected with a 400 and nothing changes.
            Membership changes take effect immediately: when the group has a pinned target snapshot, devices added to the group are told to deploy it, and devices removed from the group have it cleared. Confirm with the user before changing membership of a group with a target snapshot.
            Requires the deviceGroups feature to be enabled for the owning team; if it is not, this returns a not-found error.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            applicationId: applicationId.describe('The hashid of the application the group belongs to'),
            groupId: z.string().describe('The hashid of the device group whose membership to change'),
            add: z.array(z.string()).optional().describe('Hashids of devices to add to the group'),
            remove: z.array(z.string()).optional().describe('Hashids of devices to remove from the group'),
            set: z.array(z.string()).optional().describe('Hashids of devices to set as the exact membership, replacing the current list. Overrides add/remove')
        },
        handler: async (args, { inject }) => {
            const payload = {}
            for (const key of ['add', 'remove', 'set']) {
                if (args[key] !== undefined) {
                    payload[key] = args[key]
                }
            }
            const response = await inject({ method: 'PATCH', url: `/api/v1/applications/${args.applicationId}/device-groups/${args.groupId}`, payload })
            return response
        }
    },
    {
        name: 'platform_update_device_group_settings',
        title: 'Update Device Group Settings',
        description: `FlowFuse platform automation tool:
            Replaces the environment variables shared by the devices in a device group. env is the FULL replacement list: variables missing from it are removed, so read the current list first (platform_get_application_device_group) and resend everything that should stay.
            Names must start with a letter or underscore and contain only letters, digits and underscores; duplicates are rejected.
            To keep an existing hidden (secret) variable's stored value without knowing it, resend it with hidden true and an empty value.
            Changes take effect immediately: member devices are told to pick up the new environment. Confirm with the user before updating.
            Requires the deviceGroups feature to be enabled for the owning team; if it is not, this returns a not-found error.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            applicationId: applicationId.describe('The hashid of the application the group belongs to'),
            groupId: z.string().describe('The hashid of the device group whose settings to update'),
            env: z.array(z.object({
                name: z.string().describe('Environment variable name: a letter or underscore followed by letters, digits or underscores'),
                value: z.string().describe('Environment variable value. For an existing hidden variable, pass an empty string (with hidden true) to keep the stored value'),
                hidden: z.boolean().optional().describe('Whether the value is masked in the UI')
            })).describe('Full replacement list of the group environment variables')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'PUT', url: `/api/v1/applications/${args.applicationId}/device-groups/${args.groupId}/settings`, payload: { env: args.env } })
            return response
        }
    }
]
