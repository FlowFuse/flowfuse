module.exports = [
    {
        name: 'platform_list_hosted_instance_types',
        description: 'FlowFuse platform automation tool: List all available hosted instance types. Use this to find valid projectType values when creating a hosted instance.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/project-types' })
            return response
        }
    },
    {
        name: 'platform_list_stacks',
        description: 'FlowFuse platform automation tool: List all available stacks (Node-RED versions). Use this to find valid stack values when creating a hosted instance.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/stacks' })
            return response
        }
    },
    {
        name: 'platform_list_blueprints',
        description: 'FlowFuse platform automation tool: List all available flow blueprints. Blueprints provide starter flows that can be used when creating a new hosted instance.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/flow-blueprints' })
            return response
        }
    }
]
