const { z } = require('zod')

module.exports = [
    {
        name: 'platform.list-instances',
        description: 'List all instances in an application.',
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
        name: 'platform.get-instance',
        description: 'Get details of a specific instance, including its current state, URL, and settings.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            instanceId: z.string().describe('The ID or hashid of the instance')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.instanceId}` })
            return response
        }
    },
    {
        name: 'platform.get-instance-status',
        description: 'Get the live runtime status of an instance (running, stopped, suspended, starting, etc).',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            instanceId: z.string().describe('The ID or hashid of the instance')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.instanceId}/status` })
            return response
        }
    },
    {
        name: 'platform.get-instance-logs',
        description: 'Get runtime logs for an instance. Useful for debugging after restarts or failures.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            instanceId: z.string().describe('The ID or hashid of the instance'),
            limit: z.number().optional().describe('Number of log entries to return (default 30)'),
            cursor: z.string().optional().describe('Cursor for pagination')
        },
        handler: async (args, { inject }) => {
            let url = `/api/v1/projects/${args.instanceId}/logs`
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
        name: 'platform.check-name-availability',
        description: 'Check if an instance name is available.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            name: z.string().describe('The instance name to check')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'POST', url: '/api/v1/projects/check-name', payload: { name: args.name } })
            return response
        }
    },
    {
        name: 'platform.create-instance',
        description: 'Create a new Node-RED instance in an application. The instance starts automatically after creation. Use platform.list-instance-types, platform.list-stacks, and platform.list-blueprints to discover valid values for the required parameters.',
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
            name: z.string().describe('Name for the new instance'),
            applicationId: z.string().describe('The ID or hashid of the application'),
            projectType: z.string().describe('The ID of the instance type (use platform.list-instance-types to find valid values)'),
            stack: z.string().describe('The ID of the stack (use platform.list-stacks to find valid values)'),
            template: z.string().describe('The ID of the template'),
            flowBlueprintId: z.string().optional().describe('Optional blueprint ID to initialize the instance with starter flows')
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
