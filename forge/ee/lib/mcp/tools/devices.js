const { z } = require('zod')

module.exports = [
    {
        name: 'platform_list_team_remote_instances',
        description: `FlowFuse platform automation tool:
            Lists all remote instances that belong to a team.
            Remote instances are sometimes referred to as devices.
            A remote instance is a Node-RED that runs on the user's own hardware (like a Raspberry Pi or an edge server) rather than on the same environment as the FlowFuse platform.
            Use this when you need to see all the remote instances a team has, regardless of which application they belong to.
            If you already know the application, use platform_get_application_remote_instances instead to get a narrower list.
            To get the full details of one specific remote instance, call platform_get_remote_instance with its ID.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().describe('The ID or hashid of the team'),
            query: z.string().optional().describe('Search remote instances by name or type'),
            cursor: z.string().optional().describe('Cursor for pagination (the hashid of the last item from the previous page)'),
            limit: z.number().optional().describe('How many results to return per page (default 100, max 100)')
        },
        handler: async (args, { inject }) => {
            let url = `/api/v1/teams/${args.teamId}/devices`
            const params = []
            if (args.query) {
                params.push(`query=${args.query}`)
            }
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
        name: 'platform_get_remote_instance',
        description: `FlowFuse platform automation tool:
            Gets the full details of one specific remote instance.
            Remote instances are sometimes referred to as devices.
            Use this when you already have a remote instance ID and need to know everything about it:
            its name, online/offline status, which application and team it belongs to, what device group it is in,
            what snapshot it is currently running, and what snapshot it should be running (the target).
            If you need to list all remote instances first, call platform_list_remote_instances or platform_get_application_remote_instances.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            remoteInstanceId: z.string().describe('The ID or hashid of the remote instance')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/devices/${args.remoteInstanceId}` })
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
            limit: z.number().optional().describe('How many results to return per page')
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
    },
    {
        name: 'platform_get_remote_instance_status',
        description: `FlowFuse platform automation tool:
            Gets the live running status of a remote instance by querying the device directly over MQTT.
            This returns the real-time state of the Node-RED runtime on the device (running, stopped, installing, etc.),
            not the last-known state stored on the platform.
            The remote instance must be online and reachable for this to work. If the device is offline, the call will time out.
            Use this when you need to know what the device is actually doing right now.
            Other tools like platform_create_remote_instance_snapshot require the device to be running.
            Always call this tool first to verify the device is live before using those tools.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().describe('The hashid of the team that owns the remote instance. You can get this from platform_get_remote_instance or ui_get_context.'),
            remoteInstanceId: z.string().describe('The ID or hashid of the remote instance')
        },
        handler: async (args, { comms }) => {
            if (!comms) {
                return { error: 'Device communications not available' }
            }
            const response = await comms.sendCommandAwaitReply(args.teamId, args.remoteInstanceId, 'get-liveState', {}, { timeout: 3000 })
            return response
        }
    }
]
