const { z } = require('zod')

const { teamId, hostedInstanceId, basePagination, basePaginationKeys, searchQuery, searchQueryKeys, auditLogFilters, auditLogFilterKeys, limitParam, limitParamKeys, pageParam, pageParamKeys, appendQuery } = require('../schemas')

// Audit-log routes accept cursor+limit pagination, free-text query, event
// (single name or array) and username. scope narrows which entity levels are
// returned; includeChildren pulls in descendant entries within the chosen scope.
const includeChildren = z.boolean().optional().describe('Also include audit entries from child entities within the chosen scope')
const auditLogInput = { ...basePagination, ...searchQuery, ...auditLogFilters }
const auditLogKeys = [...basePaginationKeys, ...searchQueryKeys, ...auditLogFilterKeys]

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
            2. If they want a specific Node-RED version or stack, or just the latest. Call platform_list_stacks to get the options. If the user has no preference, use the latest available stack.
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
    },
    {
        name: 'platform_get_instance_ha',
        title: 'Get Instance High Availability',
        description: `FlowFuse platform automation tool:
            Returns the High Availability configuration for a hosted instance.
            High Availability runs an instance across multiple replicas so it stays up if one replica fails.
            High Availability is a plan-gated feature: a team without it enabled gets a 404 error.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/ha` })
            return response
        }
    },
    {
        name: 'platform_get_instance_custom_hostname',
        title: 'Get Instance Custom Hostname',
        description: `FlowFuse platform automation tool:
            Returns the custom hostname configured for a hosted instance.
            Custom hostnames are a plan-gated feature: a team without it enabled gets a 404 error.
            Use platform_get_instance_custom_hostname_status to check whether the hostname is verified and routable.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/customHostname` })
            return response
        }
    },
    {
        name: 'platform_get_instance_custom_hostname_status',
        title: 'Get Instance Custom Hostname Status',
        description: `FlowFuse platform automation tool:
            Returns the status of the custom hostname for a hosted instance, i.e. whether the DNS
            CNAME record has been set up correctly and points at the platform.
            A 200 response means the hostname is verified. A 410 response means a hostname is set
            but its CNAME record does not resolve to the platform yet. A 404 response can mean no
            custom hostname is configured, the platform does not support hostname verification, or
            the custom hostname feature is not enabled for the team.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/customHostname/status` })
            return response
        }
    },
    {
        name: 'platform_get_instance_protection',
        title: 'Get Instance Protection',
        description: `FlowFuse platform automation tool:
            Returns the protected-instance configuration for a hosted instance.
            A protected instance requires extra confirmation before destructive actions such as
            suspension or deletion can be performed against it.
            Protected instance is a plan-gated feature: a team without it enabled gets a 404 error.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/protectInstance` })
            return response
        }
    },
    {
        name: 'platform_get_instance_auto_update_stack',
        title: 'Get Instance Auto-Update Stack Schedule',
        description: `FlowFuse platform automation tool:
            Returns the auto-update stack (weekly restart) schedule for a hosted instance.
            This schedule controls the windows in which the platform is allowed to automatically
            restart the instance to apply a stack update.
            This surface has no plan gate: a 404 response means the instance does not exist.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/autoUpdateStack` })
            return response
        }
    },
    {
        name: 'platform_list_instance_files',
        title: 'List Instance Files',
        description: `FlowFuse platform automation tool:
            Lists files and directories within a hosted instance file store at the given path.
            Use an empty string for the path to list the root of the file store.
            Static file storage is a plan-gated feature: a team without it enabled gets a 404 error.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId,
            path: z.string().describe('Directory path within the instance file store to list')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/files/_/${encodeURIComponent(args.path)}` })
            return response
        }
    },
    {
        name: 'platform_list_instance_http_tokens',
        title: 'List Instance HTTP Tokens',
        description: `FlowFuse platform automation tool:
            Lists the HTTP bearer tokens configured for a hosted instance.
            These tokens are used by external callers to authenticate HTTP requests handled by the
            instance's Node-RED flows.
            HTTP bearer tokens are a plan-gated feature: a team without it enabled gets a 404 error.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/httpTokens` })
            return response
        }
    },
    {
        name: 'platform_get_hosted_instance_audit_log',
        title: 'Get Hosted Instance Audit Log',
        description: `FlowFuse platform automation tool:
            Reads the audit log for a hosted instance, showing events like deployments, restarts,
            settings changes, and other actions taken against that instance.
            Use this when the user wants to know what has happened to a specific hosted instance.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId,
            ...auditLogInput,
            scope: z.enum(['project', 'device']).optional().describe('Entity level to include (default project)'),
            includeChildren
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/projects/${args.hostedInstanceId}/audit-log`, args, [...auditLogKeys, 'scope', 'includeChildren'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_export_hosted_instance_audit_log',
        title: 'Export Hosted Instance Audit Log',
        description: `FlowFuse platform automation tool:
            Exports a hosted instance audit log as a CSV file.
            Use this when the user wants a downloadable or shareable copy of the instance's audit history,
            rather than reading entries directly with platform_get_hosted_instance_audit_log.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId,
            ...auditLogInput,
            scope: z.enum(['project', 'device']).optional().describe('Entity level to include (default project)'),
            includeChildren
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/projects/${args.hostedInstanceId}/audit-log/export`, args, [...auditLogKeys, 'scope', 'includeChildren'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_get_hosted_instance_history',
        title: 'Get Hosted Instance History',
        description: `FlowFuse platform automation tool:
            Reads a timeline of changes made to a hosted instance over time.
            This is plan-gated on the projectHistory feature, which defaults to enabled;
            if the team's plan has this feature disabled, the tool reports that instance history
            is not enabled for this team rather than a bare not-found error.
            Use this when the user wants a chronological view of what changed on an instance.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId,
            ...basePagination
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/projects/${args.hostedInstanceId}/history`, args, basePaginationKeys)
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_get_hosted_instance_resources',
        title: 'Get Hosted Instance Resources',
        description: `FlowFuse platform automation tool:
            Reads a point-in-time snapshot of resource usage (CPU, memory) for a hosted instance.
            This is plan-gated on the instanceResources feature, which defaults to disabled;
            if the team's plan has this feature disabled, the tool reports that resource usage
            is not enabled for this team rather than a bare not-found error.
            This only returns a snapshot, not a live streaming feed.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/resources` })
            return response
        }
    },
    {
        name: 'platform_list_team_projects',
        title: 'List Team Projects',
        description: `FlowFuse platform automation tool:
            Lists the hosted instances (projects) in a team, with optional name filtering, sorting, and pagination.
            Use this for a lighter-weight or differently sorted view of a team's hosted instances than looking up each application individually.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            query: z.string().optional().describe('Filter instances by name substring'),
            sort: z.enum(['name', 'createdAt', 'updatedAt', 'application.name', 'flowLastUpdatedAt']).optional().describe('Field to sort the instance list by'),
            dir: z.enum(['asc', 'desc']).optional().describe('Sort direction for the sort field'),
            includeMeta: z.boolean().optional().describe('Include instance settings and metadata in each row (default false)'),
            orderByMostRecentFlows: z.boolean().optional().describe('Order results by most recently updated flows (default false)'),
            ...limitParam,
            ...pageParam
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/projects`, args, [
                'query', 'sort', 'dir', 'includeMeta', 'orderByMostRecentFlows', ...limitParamKeys, ...pageParamKeys
            ])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_list_team_dashboard_instances',
        title: 'List Team Dashboard Instances',
        description: `FlowFuse platform automation tool:
            Lists the hosted instances in a team that have the Node-RED dashboard module installed.
            Use this to find instances that expose a dashboard rather than checking every instance individually.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/dashboard-instances` })
            return response
        }
    }
]
