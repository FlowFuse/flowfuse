const { z } = require('zod')

const { basePagination, basePaginationKeys, appendQuery, hostedInstanceId, remoteInstanceId, snapshotId } = require('../schemas')

module.exports = [
    {
        name: 'platform_list_hosted_instance_snapshots',
        title: 'List Hosted Instance Snapshots',
        description: `FlowFuse platform automation tool:
            Lists all snapshots that were taken from a hosted instance.
            A snapshot is like a saved photo of everything running on the hosted instance at a point in time: the flows, the settings, and the configuration.
            Use this when you need to see what snapshots exist for a hosted instance, for example to pick one to deploy or to check what changed between versions.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId,
            cursor: z.string().optional().describe('Cursor for pagination (the hashid of the last item from the previous page)'),
            limit: z.number().min(1).max(20).describe('How many results to return per page')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/projects/${args.hostedInstanceId}/snapshots`, args, basePaginationKeys)
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
        name: 'platform_list_remote_instance_snapshots',
        title: 'List Remote Instance Snapshots',
        description: `FlowFuse platform automation tool:
            Lists all snapshots that were taken from a remote instance (device).
            A snapshot is like a saved photo of everything running on the remote instance at a point in time: the flows, the settings, and the configuration.
            Use this when you need to see what snapshots exist for a remote instance, for example to pick one to deploy or to check what changed between versions.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            remoteInstanceId,
            cursor: z.string().optional().describe('Cursor for pagination (the hashid of the last item from the previous page)'),
            limit: z.number().min(1).max(20).describe('How many results to return per page')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/devices/${args.remoteInstanceId}/snapshots`, args, basePaginationKeys)
            const response = await inject({ method: 'GET', url })
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
        name: 'platform_get_hosted_instance_snapshot',
        title: 'Get Hosted Instance Snapshot',
        description: `FlowFuse platform automation tool:
            Gets a single snapshot owned by a hosted instance, including its name, description, and metadata.
            Use this when you already know which hosted instance and snapshot you want details for.
            If you need to see all snapshots for a hosted instance first, call platform_list_hosted_instance_snapshots.
            To get the full flows/settings/env payload of the snapshot instead of just metadata, call platform_get_snapshot_full.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId,
            snapshotId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/snapshots/${args.snapshotId}` })
            return response
        }
    },
    {
        name: 'platform_get_remote_instance_snapshot',
        title: 'Get Remote Instance Snapshot',
        description: `FlowFuse platform automation tool:
            Gets a single snapshot owned by a remote instance (device), including its name, description, and metadata.
            Use this when you already know which remote instance and snapshot you want details for.
            If you need to see all snapshots for a remote instance first, call platform_list_remote_instance_snapshots.
            To get the full flows/settings/env payload of the snapshot instead of just metadata, call platform_get_snapshot_full.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            remoteInstanceId,
            snapshotId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/devices/${args.remoteInstanceId}/snapshots/${args.snapshotId}` })
            return response
        }
    },
    {
        name: 'platform_get_snapshot',
        title: 'Get Snapshot',
        description: `FlowFuse platform automation tool:
            Gets snapshot metadata by snapshot id alone, without needing to know which hosted instance or remote instance owns it.
            The owning instance or device is resolved automatically from the snapshot.
            Use this when you only have a snapshot id, for example from an audit log entry or a reference returned by another tool.
            To get the full flows/settings/env payload of the snapshot instead of just metadata, call platform_get_snapshot_full.`,
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
            Gets the full payload of a snapshot by snapshot id: flows, runtime settings, and environment variables. Credentials are never included.
            This payload can be large and may include sensitive configuration such as environment variable values, so only call this when the content is actually needed.
            Use platform_get_snapshot instead when only the snapshot name, description, or other metadata is required.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            snapshotId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/snapshots/${args.snapshotId}/full` })
            return response
        }
    },
    {
        name: 'platform_list_instance_target_devices',
        title: 'List Hosted Instance Target Devices',
        description: `FlowFuse platform automation tool:
            Lists the remote instances (devices) assigned to a hosted instance.
            Use this to see which devices will receive the hosted instance's target snapshot when it is deployed to devices.
            To check or change which snapshot is currently targeted, call platform_get_instance_device_settings.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId,
            ...basePagination
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/projects/${args.hostedInstanceId}/devices`, args, basePaginationKeys)
            const response = await inject({ method: 'GET', url })
            return response
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
