const { z } = require('zod')

module.exports = [
    {
        name: 'platform_get_hosted_instance',
        title: 'Get Hosted Instance',
        description: `FlowFuse platform automation tool:
            Gets the full details of one specific hosted instance.
            A hosted instance is a Node-RED that runs on the same environment as the FlowFuse platform.
            Use this when you already have a hosted instance ID and need to know everything about it:
            its name, URL, settings, what application and team it belongs to, and its current state.
            If you need to list all hosted instances first, call platform_get_application_hosted_instances.
            To check the live running status, call platform_get_hosted_instance_status instead.`,
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
        title: 'Get Hosted Instance Status',
        description: `FlowFuse platform automation tool:
            Gets the live running status of a specific hosted instance (running, stopped, suspended, starting, etc.).
            This is different from platform_get_hosted_instance: that tool gives you metadata and settings,
            this tool tells you what the instance is doing right now.
            Use this when the user asks if an instance is running, or when you need to check before performing an action that requires it to be online.`,
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
        title: 'Get Hosted Instance Logs',
        description: `FlowFuse platform automation tool:
            Gets the runtime logs for a hosted instance.
            These are the Node-RED console logs showing what happened while the instance was running.
            Use this when the user wants to debug a problem, check what happened after a restart, or look for errors.
            Results come back newest first. Use cursor to page through older entries.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId: z.string().describe('The ID or hashid of the hosted instance'),
            limit: z.number().min(1).max(100).describe('Number of log entries to return'),
            cursor: z.string().optional().describe('Cursor for pagination (the ID of the last entry from the previous page)')
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
        title: 'Check Hosted Instance Name Availability',
        description: `FlowFuse platform automation tool:
            Checks if a name is available for a new hosted instance.
            Hosted instance names must be unique across the entire platform.
            Use this before calling platform_create_hosted_instance to make sure the name the user picked is not already taken.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]*$/).describe('The hosted instance name to check')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'POST', url: '/api/v1/projects/check-name', payload: { name: args.name } })
            return response
        }
    },
    {
        name: 'platform_create_hosted_instance',
        title: 'Create Hosted Instance',
        description: `FlowFuse platform automation tool:
            Creates a new hosted Node-RED instance inside an application. The instance starts automatically after creation.
            Before calling this tool, gather the required parameters:
            1. Call platform_list_hosted_instance_types first to see what instance types are available on this platform, then ask the user which one they want.
            2. If they want a specific Node-RED version or stack, or just the latest. Call platform_list_stacks for the chosen instance type to get the options. If the user has no preference, use the instance type's defaultStack, which is the latest recommended version.
            3. If they want to start from a blueprint (pre-built starter flows). Call platform_list_blueprints to show them what is available. This is optional.
            4. Call platform_list_templates to get the template. If only one template exists, use it automatically. If there are multiple, ask the user which one to use.
            5. Call platform_check_hosted_instance_name_availability to make sure the chosen name is not already taken.
            When generating a name, always use hyphens to separate multiple words (e.g. "my-new-instance" not "my new instance").
            After the instance is created, wait a few seconds to give it time to boot up, then ask the user if they want to be taken to it. If they do, use the ui_navigate tool with the route name "instance-overview" and params { id: <the new instance id> }.`,
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
            name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]*$/).describe('Name for the new hosted instance. When generating a name, always use hyphens to separate multiple words (e.g. "my-new-instance" not "my new instance").'),
            applicationId: z.string().describe('The ID or hashid of the application'),
            projectType: z.string().describe('The ID of the hosted instance type (use platform_list_hosted_instance_types to find valid values)'),
            stack: z.string().describe('The ID of the stack (use platform_list_stacks to find valid values)'),
            template: z.string().describe('The ID of the template (use platform_list_templates to find valid values)'),
            flowBlueprintId: z.string().optional().describe('Optional blueprint ID to initialize the hosted instance with starter flows (use platform_list_blueprints to find valid values)')
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
