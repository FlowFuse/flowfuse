const { z } = require('zod')

const { appendQuery, applicationId, basePagination, basePaginationKeys, searchQuery, searchQueryKeys, teamId, toolError } = require('../schemas')

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
            Group names are not unique: creating a second group with an existing name succeeds.
            Requires the deviceGroups feature to be enabled for the owning team; if it is not (or the application does not exist) this returns a not-found error.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            applicationId: applicationId.describe('The hashid of the application to create the device group in'),
            name: z.string().min(1).describe('Name for the new device group'),
            description: z.string().optional().describe('Description for the group. Defaults to an empty string rather than being left unset, because a group stored without one breaks the device group listings')
        },
        handler: async (args, { inject }) => {
            // A group created without a description is stored with a null one, which
            // fails the route's own response schema: the create answers 500 having
            // created the group anyway, and every later listing of the application's
            // and the team's groups then 500s on that row too. Default it instead.
            const payload = { name: args.name, description: args.description ?? '' }
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
            Pass at least one of name, description or targetSnapshotId.
            Requires the deviceGroups feature to be enabled for the owning team; if it is not, this returns a not-found error.`,
        // destructiveHint: pinning a target snapshot deploys it to every member device,
        // the same reasoning as platform_set_instance_device_target.
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
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
            // The route replies 200 with the group untouched when there is nothing to
            // change, which reads as a successful edit that never happened.
            if (Object.keys(payload).length === 0) {
                return toolError(400, 'invalid_request', 'Pass at least one of name, description or targetSnapshotId to update')
            }
            const response = await inject({ method: 'PUT', url: `/api/v1/applications/${args.applicationId}/device-groups/${args.groupId}`, payload })
            return response
        }
    },
    {
        name: 'platform_update_device_group_membership',
        title: 'Update Device Group Membership',
        description: `FlowFuse platform automation tool:
            Changes which remote instances (devices) belong to a device group. Use add and/or remove for incremental changes, or set to replace the entire membership atomically (set overrides add/remove). A successful update returns an empty object. Pass at least one of add, remove or set.
            Listing a device in both add and remove does not reliably remove it: the result depends on where the device started, so a current member ends up removed but a non-member ends up added. Do not use that to force a device out; pass it in remove only, or use set.
            Devices must belong to the same application as the group, otherwise the whole call is rejected with a 400 and nothing changes.
            Membership changes take effect immediately: when the group has a pinned target snapshot, devices added to the group are told to deploy it, and devices removed from the group have it cleared. Confirm with the user before changing membership of a group with a target snapshot.
            Requires the deviceGroups feature to be enabled for the owning team; if it is not, this returns a not-found error.`,
        // destructiveHint: set replaces the whole membership, and removing a device
        // clears the group's target snapshot from it, so this removes rather than adds.
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
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
            // As with the update route, an empty body is answered 200 with nothing changed.
            if (Object.keys(payload).length === 0) {
                return toolError(400, 'invalid_request', 'Pass at least one of add, remove or set to change membership')
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
        // destructiveHint: env is a full replacement, so anything left out is deleted.
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
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
