const { z } = require('zod')

module.exports = [
    {
        name: 'platform_list_hosted_instance_snapshots',
        description: 'FlowFuse platform automation tool: List all snapshots for a hosted instance.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId: z.string().describe('The ID or hashid of the hosted instance')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/snapshots` })
            return response
        }
    },
    {
        name: 'platform_create_hosted_instance_snapshot',
        description: 'FlowFuse platform automation tool: Create a snapshot of a hosted instance, capturing its current flows, settings, and credentials.',
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
    }
]
