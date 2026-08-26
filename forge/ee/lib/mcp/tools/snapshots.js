const { z } = require('zod')

const { basePaginationKeys, limitParam, appendQuery, hostedInstanceId, snapshotId } = require('../schemas')
const { blankHiddenEnvValues } = require('../utils')

module.exports = [
    {
        name: 'platform_list_instance_snapshots',
        title: 'List Instance Snapshots',
        description: `FlowFuse platform automation tool:
            Lists the snapshots taken from a hosted instance or a remote instance (device).
            A snapshot is like a saved photo of everything running on the instance at a point in time: the flows, the settings, and the configuration.
            Set instanceType to "hosted" or "remote" to say which kind of instance instanceId refers to.
            Use this when you need to see what snapshots exist for an instance, for example to pick one to deploy or to check what changed between versions.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            instanceType: z.enum(['hosted', 'remote']).describe('Which kind of instance instanceId refers to: "hosted" for a hosted instance, "remote" for a remote instance (device)'),
            instanceId: z.string().describe('The ID of the instance whose snapshots to list (UUID for a hosted instance, hashid for a remote instance)'),
            cursor: z.string().optional().describe('Cursor for pagination (the hashid of the last item from the previous page)'),
            ...limitParam
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
        name: 'platform_create_instance_snapshot',
        title: 'Create Instance Snapshot',
        description: `FlowFuse platform automation tool:
            Creates a new snapshot from a hosted instance or a remote instance (device), capturing everything it is running right now (flows, settings, and configuration).
            Think of it as taking a photo of the instance so you can go back to this exact state later or deploy it elsewhere.
            Set instanceType to "hosted" or "remote" to say which kind of instance instanceId refers to.
            When instanceType is "remote", the device must be online and running or this will fail; call platform_get_remote_instance_status first to check.
            Use this when the user wants to save the current state of an instance before making changes, or to create a version that can be rolled out elsewhere.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            instanceType: z.enum(['hosted', 'remote']).describe('Which kind of instance instanceId refers to: "hosted" for a hosted instance, "remote" for a remote instance (device)'),
            instanceId: z.string().describe('The ID of the instance to snapshot (UUID for a hosted instance, hashid for a remote instance)'),
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
            const url = args.instanceType === 'hosted'
                ? `/api/v1/projects/${args.instanceId}/snapshots`
                : `/api/v1/devices/${args.instanceId}/snapshots`
            const response = await inject({ method: 'POST', url, payload })
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
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
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
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
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
        name: 'platform_get_hosted_instance_device_target_snapshot',
        title: 'Get Hosted Instance Device Target Snapshot',
        description: `FlowFuse platform automation tool:
            Gets the target snapshot for the remote instances (devices) assigned to a hosted instance: the snapshot those devices are set to deploy. Returns null when no target snapshot is set.
            Use this to check which snapshot the instance's assigned devices will run next.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/devices/settings` })
            return response
        }
    }
]
