const { z } = require('zod')

module.exports = [
    {
        name: 'platform_list_hosted_instance_snapshots',
        description: `FlowFuse platform automation tool:
            Lists all snapshots that were taken from a hosted instance.
            A snapshot is like a saved photo of everything running on the hosted instance at a point in time: the flows, the settings, and the configuration.
            Use this when you need to see what snapshots exist for a hosted instance, for example to pick one to deploy or to check what changed between versions.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId: z.string().describe('The ID or hashid of the hosted instance'),
            cursor: z.string().optional().describe('Cursor for pagination (the hashid of the last item from the previous page)'),
            limit: z.number().min(1).max(20).describe('How many results to return per page')
        },
        handler: async (args, { inject }) => {
            let url = `/api/v1/projects/${args.hostedInstanceId}/snapshots`
            const params = []
            if (args.cursor) {
                params.push(`cursor=${args.cursor}`)
            }
            if (args.limit) {
                params.push(`limit=${args.limit}`)
            }
            if (params.length > 0) {
                url += '?' + params.join('&')
            }
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_create_hosted_instance_snapshot',
        description: `FlowFuse platform automation tool:
            Creates a new snapshot from a hosted instance, capturing everything it is running right now (flows, settings, and configuration).
            Think of it as taking a photo of the hosted instance so you can go back to this exact state later or deploy it to other hosted instances.
            Use this when the user wants to save the current state of a hosted instance before making changes, or to create a version that can be rolled out elsewhere.`,
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
            hostedInstanceId: z.string().describe('The ID or hashid of the hosted instance'),
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
        description: `FlowFuse platform automation tool:
            Lists all snapshots that were taken from a remote instance (device).
            A snapshot is like a saved photo of everything running on the remote instance at a point in time: the flows, the settings, and the configuration.
            Use this when you need to see what snapshots exist for a remote instance, for example to pick one to deploy or to check what changed between versions.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            remoteInstanceId: z.string().describe('The ID or hashid of the remote instance'),
            cursor: z.string().optional().describe('Cursor for pagination (the hashid of the last item from the previous page)'),
            limit: z.number().min(1).max(20).describe('How many results to return per page')
        },
        handler: async (args, { inject }) => {
            let url = `/api/v1/devices/${args.remoteInstanceId}/snapshots`
            const params = []
            if (args.cursor) {
                params.push(`cursor=${args.cursor}`)
            }
            if (args.limit) {
                params.push(`limit=${args.limit}`)
            }
            if (params.length > 0) {
                url += '?' + params.join('&')
            }
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_create_remote_instance_snapshot',
        description: `FlowFuse platform automation tool:
            This tool will always fail if the remote instance is not reachable.
            This tool exclusively creates snapshots, it does not create anything else.
            Before calling this tool, you must call platform_get_remote_instance_status first to check that the device is online and running.
            Creates a new snapshot from a remote instance, capturing everything it is running right now (flows, settings, and configuration).
            Think of it as taking a photo of the remote instance so you can go back to this exact state later or deploy it to other remote instances.
            Use this when the user wants to save the current state of a remote instance before making changes, or to create a snapshot that can be rolled out elsewhere.`,
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
            remoteInstanceId: z.string().describe('The ID or hashid of the remote instance'),
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
    }
]
