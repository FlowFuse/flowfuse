const { z } = require('zod')

module.exports = [
    {
        name: 'platform_list_hosted_instances',
        description: 'FlowFuse platform automation tool: List all hosted instances in an application.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            applicationId: z.string().describe('The ID or hashid of the application')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/applications/${args.applicationId}/instances` })
            return response
        }
    },
    {
        name: 'platform_get_hosted_instance',
        description: 'FlowFuse platform automation tool: Get details of a specific hosted instance, including its current state, URL, and settings.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId: z.string().describe('The ID or hashid of the hosted instance')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}` })
            return response
        }
    },
    {
        name: 'platform_get_hosted_instance_status',
        description: 'FlowFuse platform automation tool: Get the live runtime status of a hosted instance (running, stopped, suspended, starting, etc).',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId: z.string().describe('The ID or hashid of the hosted instance')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/status` })
            return response
        }
    },
    {
        name: 'platform_get_hosted_instance_logs',
        description: 'FlowFuse platform automation tool: Get runtime logs for a hosted instance. Useful for debugging after restarts or failures.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId: z.string().describe('The ID or hashid of the hosted instance'),
            limit: z.number().optional().describe('Number of log entries to return (default 30)'),
            cursor: z.string().optional().describe('Cursor for pagination')
        },
        handler: async (args, { inject }) => {
            let url = `/api/v1/projects/${args.hostedInstanceId}/logs`
            const params = []
            if (args.limit) {
                params.push(`limit=${args.limit}`)
            }
            if (args.cursor) {
                params.push(`cursor=${args.cursor}`)
            }
            if (params.length > 0) {
                url += '?' + params.join('&')
            }
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_check_hosted_instance_name_availability',
        description: 'FlowFuse platform automation tool: Check if a hosted instance name is available.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            name: z.string().describe('The hosted instance name to check')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'POST', url: '/api/v1/projects/check-name', payload: { name: args.name } })
            return response
        }
    },
    {
        name: 'platform_create_hosted_instance',
        description: 'FlowFuse platform automation tool: Create a new hosted Node-RED instance in an application. The hosted instance starts automatically after creation. Use platform_list_hosted_instance_types, platform_list_stacks, and platform_list_blueprints to discover valid values for the required parameters.',
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
            name: z.string().describe('Name for the new hosted instance'),
            applicationId: z.string().describe('The ID or hashid of the application'),
            projectType: z.string().describe('The ID of the hosted instance type (use platform_list_hosted_instance_types to find valid values)'),
            stack: z.string().describe('The ID of the stack (use platform_list_stacks to find valid values)'),
            template: z.string().describe('The ID of the template'),
            flowBlueprintId: z.string().optional().describe('Optional blueprint ID to initialize the hosted instance with starter flows')
        },
        handler: async (args, { inject }) => {
            const payload = {
                name: args.name,
                applicationId: args.applicationId,
                projectType: args.projectType,
                stack: args.stack,
                template: args.template
            }
            if (args.flowBlueprintId) {
                payload.flowBlueprintId = args.flowBlueprintId
            }
            const response = await inject({ method: 'POST', url: '/api/v1/projects', payload })
            return response
        }
    }
]
