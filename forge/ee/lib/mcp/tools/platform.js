const { z } = require('zod')

module.exports = [
    {
        name: 'platform_list_hosted_instance_types',
        title: 'List Hosted Instance Types',
        description: `FlowFuse platform automation tool:
            Lists the available hosted instance types.
            Use this to find valid projectType values when creating a hosted instance.
            Each type includes a defaultStack, which is the recommended (latest) stack for that type.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/project-types' })
            return response
        }
    },
    {
        name: 'platform_list_stacks',
        title: 'List Stacks',
        description: `FlowFuse platform automation tool:
            Lists the available stacks (Node-RED versions) for a given hosted instance type.
            Use this to find valid stack values when creating a hosted instance.
            When the user has no preference, use the instance type's defaultStack (from platform_list_hosted_instance_types), which is the latest recommended version.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            instanceType: z.string().describe('The ID of the hosted instance type to list stacks for (use platform_list_hosted_instance_types to find valid values)')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/stacks?projectType=${args.instanceType}` })
            return response
        }
    },
    {
        name: 'platform_list_templates',
        title: 'List Templates',
        description: 'FlowFuse platform automation tool: List all available templates. When creating a hosted instance, if only one template exists, use it automatically. If multiple templates exist, ask the user which one to use.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/templates' })
            return response
        }
    },
    {
        name: 'platform_list_blueprints',
        title: 'List Blueprints',
        description: 'FlowFuse platform automation tool: List all available flow blueprints. Blueprints provide starter flows that can be used when creating a new hosted instance.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/flow-blueprints' })
            return response
        }
    }
]
