const { z } = require('zod')

module.exports = [
    {
        name: 'platform.list-applications',
        description: 'List all applications in a team.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().describe('The ID or hashid of the team')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/applications` })
            return response
        }
    },
    {
        name: 'platform.get-application',
        description: 'Get details of a specific application, including its instances and devices.',
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
        name: 'platform.create-application',
        description: 'Create a new application in a team.',
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
