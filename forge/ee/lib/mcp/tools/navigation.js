const { hostedInstanceId } = require('../schemas')

module.exports = [
    {
        name: 'platform_get_hosted_instance_editor_url',
        title: 'Get Hosted Instance Editor URL',
        description: 'FlowFuse platform automation tool: Get the URL to open the Node-RED editor in immersive mode for a hosted instance. Returns a URL the user can open in their browser. Only use this tool when the user requests the URL.',
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject, app }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}` })
            if (response.statusCode >= 400) {
                return response
            }
            const instance = response.json()
            const url = `${app.config.base_url}/instance/${instance.id}/editor` // http://<base>/instance/c11f9fff-66d2-485c-9cd6-e250706e344b/editor
            return {
                statusCode: 200,
                json: () => ({ url, name: instance.name })
            }
        }
    },
    {
        name: 'platform_get_hosted_instance_overview_url',
        title: 'Get Hosted Instance Overview URL',
        description: 'FlowFuse platform automation tool: Get the URL to open the hosted instance overview page in the FlowFuse platform. Returns a URL the user can open in their browser. Only use this tool when the user requests the URL.',
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject, app }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}` })
            if (response.statusCode >= 400) {
                return response
            }
            const instance = response.json()
            const url = `${app.config.base_url}/instance/${instance.id}/overview` // http://<base>/instance/c11f9fff-66d2-485c-9cd6-e250706e344b/overview
            return {
                statusCode: 200,
                json: () => ({ url, name: instance.name })
            }
        }
    }
]
