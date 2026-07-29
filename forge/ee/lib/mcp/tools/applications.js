const { z } = require('zod')

module.exports = [
    {
        name: 'platform_list_applications',
        title: 'List Applications',
        description: `FlowFuse platform automation tool: 
            Lists all applications in a team but does not return hosted instances or remote instances. 
            Call platform_get_application to get details of a specific application. 
            Call platform_get_remote_instance to get details of a specific remote instance or platform_get_hosted_instance to get details of a specific hosted instance.`,
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
        title: 'Get Application',
        description: 'FlowFuse platform automation tool: Use this tool to retrieve application metadata (name, description, link, team createdAt and updatedAt)',
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
        name: 'platform_get_application_audit_log',
        title: 'Get Application Audit Log',
        description: `FlowFuse platform automation tool:
            Gets the audit log (activity history) for an application. Think of it as a diary that writes down everything that happened: who did what, and when.
            Use this to find out what changed, who made a change, or to figure out what went wrong by looking at recent activity.
            Results come back newest first. Use cursor to page through older entries.
            You can narrow down results by event type, username, or scope (application, project, or device).`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            applicationId: z.string().describe('The ID or hashid of the application'),
            cursor: z.string().optional().describe('Cursor for pagination (the hashid of the last entry from the previous page)'),
            limit: z.number().min(1).max(100).describe('How many entries to return'),
            event: z.string().optional().describe('Filter by event type (e.g. "application.created", "project.snapshot.device-target-set")'),
            username: z.string().optional().describe('Filter by the username of whoever triggered the event'),
            scope: z.string().optional().describe('What level of entries to include: "application", "project", or "device" (default "application")')
        },
        handler: async (args, { inject }) => {
            let url = `/api/v1/applications/${args.applicationId}/audit-log`
            const params = []
            if (args.cursor) {
                params.push(`cursor=${args.cursor}`)
            }
            if (args.limit) {
                params.push(`limit=${args.limit}`)
            }
            if (args.event) {
                params.push(`event=${args.event}`)
            }
            if (args.username) {
                params.push(`username=${args.username}`)
            }
            if (args.scope) {
                params.push(`scope=${args.scope}`)
            }
            if (params.length > 0) {
                url += '?' + params.join('&')
            }
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_create_application',
        title: 'Create Application',
        description: `FlowFuse platform automation tool:
            Creates a new application in a team.
            An application is a container that groups together hosted instances and remote instances that work together.
            Before invoking this tool, call platform_list_applications for this team to check whether an application with this name already exists. If one exists, ask the user whether to use the existing one or create a new one with the same name - DO NOT create a duplicate application without asking first.
            After the application is created, ask the user if they want to be taken to it. If they do, use the ui_navigate tool with the route name "Application" and params { id: <the new application id> }.`,
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
