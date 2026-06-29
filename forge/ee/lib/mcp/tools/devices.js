const { z } = require('zod')

module.exports = [
    {
        name: 'platform_list_remote_instances',
        description: 'FlowFuse platform automation tool: List all remote instances in a team.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().describe('The ID or hashid of the team')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/devices` })
            return response
        }
    },
    {
        name: 'platform_get_remote_instance',
        description: 'FlowFuse platform automation tool: Get details of a specific remote instance, including its status, assigned application, and target snapshot.',
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
        description: 'FlowFuse platform automation tool: List all snapshots for a remote instance.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            remoteInstanceId: z.string().describe('The ID or hashid of the remote instance')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/devices/${args.remoteInstanceId}/snapshots` })
            return response
        }
    },
    {
        name: 'platform_create_remote_instance_snapshot',
        description: 'FlowFuse platform automation tool: Create a snapshot from a remote instance, capturing its current state.',
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
