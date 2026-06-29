const { z } = require('zod')

module.exports = [
    {
        name: 'platform_list_applications',
        // TODO: Lets standardise ALL tool names and descriptions to stick with either "instances" and "devices" OR "hosted instances" and "remote instances".
        // One thing to bear in mind we will be adding a 3rd type "device-lite" :D
        description: 'FlowFuse platform automation tool: Lists all applications in a team but does not return hosted instances or remote instances. Call platform_get_application to get details of a specific application. Call platform_get_remote_instance to get details of a specific remote instance or platform_get_hosted_instance to get details of a specific hosted instance.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().describe('The ID or hashid of the team')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/applications?includeInstances=false&includeApplicationDevices=false` })
            return response
        }
    },
    {
        name: 'platform_get_application',
        description: 'FlowFuse platform automation tool: Get details of a specific application, including its hosted instances and remote instances.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            applicationId: z.string().describe('The ID or hashid of the application')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/applications/${args.applicationId}` })
            return response
        }
    },
    {
        name: 'platform_create_application',
        description: 'FlowFuse platform automation tool: Create a new application in a team.',
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
            name: z.string().describe('Name for the new application'),
            teamId: z.string().describe('The ID or hashid of the team to create the application in'),
            description: z.string().optional().describe('Optional description for the application')
        },
        handler: async (args, { inject }) => {
            const payload = { name: args.name, teamId: args.teamId }
            if (args.description) {
                payload.description = args.description
            }
            const response = await inject({ method: 'POST', url: '/api/v1/applications', payload })
            return response
        }
    }
]
