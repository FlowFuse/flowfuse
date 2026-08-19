const { z } = require('zod')

const { basePaginationKeys, appendQuery, hostedInstanceId, remoteInstanceId, snapshotId } = require('../schemas')

// Snapshots store hidden (secret) env vars as { value, hidden: true } with the
// real value; the /full route returns settings verbatim. Blank those values
// before handing the payload to the agent, keeping the key and the hidden flag.
// Visible env vars (plain string values) pass through unchanged.
function blankHiddenEnvValues (env) {
    const result = {}
    for (const [key, value] of Object.entries(env)) {
        if (value && typeof value === 'object' && value.hidden) {
            result[key] = { ...value, value: '' }
        } else {
            result[key] = value
        }
    }
    return result
}

module.exports = [
    {
        name: 'platform_list_instance_snapshots',
        title: 'List Instance Snapshots',
        description: `FlowFuse platform automation tool:
            Lists the snapshots taken from a hosted instance or a remote instance (device).
            A snapshot is like a saved photo of everything running on the instance at a point in time: the flows, the settings, and the configuration.
            Set instanceType to "hosted" or "remote" to say which kind of instance instanceId refers to.
            Use this when you need to see what snapshots exist for an instance, for example to pick one to deploy or to check what changed between versions.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            instanceType: z.enum(['hosted', 'remote']).describe('Which kind of instance instanceId refers to: "hosted" for a hosted instance, "remote" for a remote instance (device)'),
            instanceId: z.string().describe('The ID of the instance whose snapshots to list (UUID for a hosted instance, hashid for a remote instance)'),
            cursor: z.string().optional().describe('Cursor for pagination (the hashid of the last item from the previous page)'),
            limit: z.number().min(1).max(20).describe('How many results to return per page')
        },
        handler: async (args, { inject }) => {
            const base = args.instanceType === 'hosted'
                ? `/api/v1/projects/${args.instanceId}/snapshots`
                : `/api/v1/devices/${args.instanceId}/snapshots`
            const url = appendQuery(base, args, basePaginationKeys)
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_create_hosted_instance_snapshot',
        title: 'Create Hosted Instance Snapshot',
        description: `FlowFuse platform automation tool:
            Creates a new snapshot from a hosted instance, capturing everything it is running right now (flows, settings, and configuration).
            Think of it as taking a photo of the hosted instance so you can go back to this exact state later or deploy it to other hosted instances.
            Use this when the user wants to save the current state of a hosted instance before making changes, or to create a version that can be rolled out elsewhere.`,
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
            hostedInstanceId,
            name: z.string().optional().describe('Name for the snapshot'),
            description: z.string().optional().describe('Description of the snapshot')
        },
        handler: async (args, { inject }) => {
            const payload = {}
            if (args.name) {
                payload.name = args.name
            }
            if (args.description) {
                payload.description = args.description
            }
            const response = await inject({ method: 'POST', url: `/api/v1/projects/${args.hostedInstanceId}/snapshots`, payload })
            return response
        }
    },
    {
        name: 'platform_create_remote_instance_snapshot',
        title: 'Create Remote Instance Snapshot',
        description: `FlowFuse platform automation tool:
            This tool will always fail if the remote instance is not reachable.
            This tool exclusively creates snapshots, it does not create anything else.
            Before calling this tool, you must call platform_get_remote_instance_status first to check that the device is online and running.
            Creates a new snapshot from a remote instance, capturing everything it is running right now (flows, settings, and configuration).
            Think of it as taking a photo of the remote instance so you can go back to this exact state later or deploy it to other remote instances.
            Use this when the user wants to save the current state of a remote instance before making changes, or to create a snapshot that can be rolled out elsewhere.`,
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
            remoteInstanceId,
            name: z.string().optional().describe('Name for the snapshot'),
            description: z.string().optional().describe('Description of the snapshot')
        },
        handler: async (args, { inject }) => {
            const payload = {}
            if (args.name) {
                payload.name = args.name
            }
            if (args.description) {
                payload.description = args.description
            }
            const response = await inject({ method: 'POST', url: `/api/v1/devices/${args.remoteInstanceId}/snapshots`, payload })
            return response
        }
    },
    {
        name: 'platform_get_snapshot',
        title: 'Get Snapshot',
        description: `FlowFuse platform automation tool:
            Gets a single snapshot's metadata (name, description, owner, timestamps) by its id.
            Works for snapshots owned by a hosted instance or a remote instance (device); the owner is resolved automatically from the snapshot, so you do not need to know which instance owns it.
            This returns metadata only. To retrieve the full snapshot content (flows, settings, and environment variables), use platform_get_snapshot_full.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            snapshotId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/snapshots/${args.snapshotId}` })
            return response
        }
    },
    {
        name: 'platform_get_snapshot_full',
        title: 'Get Snapshot Full Payload',
        description: `FlowFuse platform automation tool:
            Gets the full payload of a snapshot by its id: flows, runtime settings, and environment variables. Works for hosted and remote instance snapshots.
            Credentials are never included, and the values of hidden (secret) environment variables are blanked; their keys are still listed.
            This payload can be large, so only call this when the content is actually needed.
            Use platform_get_snapshot instead when only the snapshot name, description, or other metadata is required.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            snapshotId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/snapshots/${args.snapshotId}/full` })
            if (response.statusCode >= 400) {
                return response
            }
            const body = response.json()
            if (body.settings?.env) {
                body.settings.env = blankHiddenEnvValues(body.settings.env)
            }
            return { statusCode: response.statusCode, json: () => body }
        }
    },
    {
        name: 'platform_get_instance_device_settings',
        title: 'Get Hosted Instance Device Settings',
        description: `FlowFuse platform automation tool:
            Reads the device settings for a hosted instance, including which snapshot (if any) is currently set as the target for devices assigned to it.
            Use this to check what devices assigned to the hosted instance will be deployed to next.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/devices/settings` })
            return response
        }
    }
]
