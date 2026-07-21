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
        name: 'platform_get_application_hosted_instances',
        title: 'Get Application Hosted Instances',
        description: `FlowFuse platform automation tool:
            Gets all the hosted instances that live inside an application.
            A hosted instance is a Node-RED that runs on the same environment as the FlowFuse platform.
            Use this to see which hosted instances an application has. Each result includes the instance id, name, URL, and basic settings.
            This list does not include an instance's specification (its instance type, stack, or template). To read an instance's specification, for example to create another instance matching it, call platform_get_hosted_instance with the instance id.
            To check if hosted instances are currently running or stopped, call platform_get_application_instances_status instead.`,
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
        name: 'platform_get_application_remote_instances',
        title: 'Get Application Remote Instances',
        description: `FlowFuse platform automation tool:
            Gets all the remote instances (devices) that live inside an application.
            A remote instance is a Node-RED that runs on the user's own hardware (like a Raspberry Pi or a server) rather than on the same environment as the FlowFuse platform.
            Use this to see which remote instances are connected to an application, check if they are online or offline, or find one by name.
            You can search by name using the query parameter and page through results using cursor or limit.
            To get the full details of one specific remote instance, call platform_get_remote_instance with its ID.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            applicationId: z.string().describe('The ID or hashid of the application'),
            query: z.string().optional().describe('Search remote instances by name'),
            cursor: z.string().optional().describe('Cursor for pagination (the hashid of the last item from the previous page)'),
            limit: z.number().min(1).max(10).describe('How many results to return per page')
        },
        handler: async (args, { inject }) => {
            let url = `/api/v1/applications/${args.applicationId}/devices`
            const params = []
            if (args.query) {
                params.push(`query=${args.query}`)
            }
            if (args.cursor) {
                params.push(`cursor=${args.cursor}`)
            }
            if (args.limit) {
                params.push(`limit=${args.limit}`)
            }
            if (params.length > 0) {
                url += '?' + params.join('&')
            }
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_get_application_instances_status',
        title: 'Get Application Instances Status',
        description: `FlowFuse platform automation tool:
            Gets the live running status of every hosted instance inside an application.
            Use this when you want to know if the hosted instances are running, stopped, or in the middle of deploying.
            This is different from platform_get_application_hosted_instances: that tool gives you names and settings,
            this tool tells you what is happening right now (is it running? is it deploying? when were the flows last updated?).`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            applicationId: z.string().describe('The ID or hashid of the application')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/applications/${args.applicationId}/instances/status` })
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
