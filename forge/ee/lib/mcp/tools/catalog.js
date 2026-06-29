module.exports = [
    {
        name: 'platform_list_instance_types',
        description: 'List all available instance types. Use this to find valid projectType values when creating an instance.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/project-types' })
            return response
        }
    },
    {
        name: 'platform_list_stacks',
        description: 'List all available stacks (Node-RED versions). Use this to find valid stack values when creating an instance.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/stacks' })
            return response
        }
    },
    {
        name: 'platform_list_blueprints',
        description: 'List all available flow blueprints. Blueprints provide starter flows that can be used when creating a new instance.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/flow-blueprints' })
            return response
        }
    }
]
