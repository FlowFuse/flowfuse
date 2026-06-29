const { z } = require('zod')

module.exports = [
    {
        name: 'platform_open_editor',
        description: 'Get the URL to open the Node-RED editor for an instance. Returns a URL the user can open in their browser.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            instanceId: z.string().describe('The ID or hashid of the instance')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.instanceId}` })
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
        name: 'platform_open_instance',
        description: 'Get the URL to open the instance dashboard in the FlowFuse platform. Returns a URL the user can open in their browser.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            instanceId: z.string().describe('The ID or hashid of the instance')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.instanceId}` })
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
