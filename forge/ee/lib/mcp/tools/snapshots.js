const { z } = require('zod')

module.exports = [
    {
        name: 'platform.list-snapshots',
        description: 'List all snapshots for an instance.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            instanceId: z.string().describe('The ID or hashid of the instance')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.instanceId}/snapshots` })
            return response
        }
    },
    {
        name: 'platform.create-snapshot',
        description: 'Create a snapshot of an instance, capturing its current flows, settings, and credentials.',
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
            instanceId: z.string().describe('The ID or hashid of the instance'),
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
            const response = await inject({ method: 'POST', url: `/api/v1/projects/${args.instanceId}/snapshots`, payload })
            return response
        }
    }
]
