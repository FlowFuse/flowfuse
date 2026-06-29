const { z } = require('zod')

module.exports = [
    {
        name: 'platform_list_devices',
        description: 'List all devices in a team.',
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
        name: 'platform_get_device',
        description: 'Get details of a specific device, including its status, assigned application, and target snapshot.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            deviceId: z.string().describe('The ID or hashid of the device')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/devices/${args.deviceId}` })
            return response
        }
    },
    {
        name: 'platform_list_device_snapshots',
        description: 'List all snapshots for an application-owned device.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            deviceId: z.string().describe('The ID or hashid of the device')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/devices/${args.deviceId}/snapshots` })
            return response
        }
    },
    {
        name: 'platform_create_device_snapshot',
        description: 'Create a snapshot from an application-owned device, capturing its current state.',
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
            deviceId: z.string().describe('The ID or hashid of the device'),
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
            const response = await inject({ method: 'POST', url: `/api/v1/devices/${args.deviceId}/snapshots`, payload })
            return response
        }
    }
]
