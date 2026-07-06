const { z } = require('zod')

module.exports = [
    {
        name: 'platform_open_hosted_instance_editor',
        title: 'Open Hosted Instance Editor',
        description: 'FlowFuse platform automation tool: Get the URL to open the Node-RED editor for a hosted instance. Returns a URL the user can open in their browser.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId: z.string().describe('The ID or hashid of the hosted instance')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}` })
            if (response.statusCode >= 400) {
                return response
            }
            const instance = response.json()
            return {
                statusCode: 200,
                json: () => ({ url: `${instance.url}/editor`, name: instance.name })
            }
        }
    },
    {
        name: 'platform_open_hosted_instance',
        title: 'Open Hosted Instance',
        description: 'FlowFuse platform automation tool: Get the URL to open the hosted instance dashboard in the FlowFuse platform. Returns a URL the user can open in their browser.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId: z.string().describe('The ID or hashid of the hosted instance')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}` })
            if (response.statusCode >= 400) {
                return response
            }
            const instance = response.json()
            return {
                statusCode: 200,
                json: () => ({ url: instance.url, name: instance.name })
            }
        }
    }
]
