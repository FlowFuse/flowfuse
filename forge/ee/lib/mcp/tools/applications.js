const { z } = require('zod')

const {
    teamId,
    applicationId,
    basePagination,
    basePaginationKeys,
    searchQuery,
    searchQueryKeys,
    auditLogFilters,
    auditLogFilterKeys,
    appendQuery
} = require('../schemas')

// Audit-log routes accept cursor+limit pagination, free-text query, event
// (single name or array) and username. scope narrows which entity levels are
// returned and its allowed values differ per route (the device route has none);
// includeChildren pulls in descendant entries within the chosen scope.
const includeChildren = z.boolean().optional().describe('Also include audit entries from child entities within the chosen scope')

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
            teamId
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
            applicationId
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
            You can narrow down results by event type, username, or scope (application, project, or device).
            Set format to "csv" to export the log as a downloadable CSV file instead of reading entries directly.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            applicationId,
            ...basePagination,
            ...searchQuery,
            ...auditLogFilters,
            scope: z.enum(['application', 'project', 'device']).optional().describe('Which entries to include by scope (default application)'),
            includeChildren,
            format: z.enum(['json', 'csv']).optional().describe('Output format. "json" (default) reads entries directly; "csv" exports the log as a downloadable CSV file.')
        },
        handler: async (args, { inject }) => {
            const suffix = args.format === 'csv' ? '/audit-log/export' : '/audit-log'
            const url = appendQuery(`/api/v1/applications/${args.applicationId}${suffix}`, args, [...basePaginationKeys, ...searchQueryKeys, ...auditLogFilterKeys, 'scope', 'includeChildren'])
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
            teamId,
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
    },
    {
        name: 'platform_list_application_snapshots',
        title: 'List Application Snapshots',
        description: `FlowFuse platform automation tool:
            Lists the snapshots belonging to an application.
            A snapshot is a saved copy of an instance's flows, credentials and settings at a point in time.
            Use this to see what snapshots are available for the hosted instances inside an application.
            Use cursor or limit to page through results.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            applicationId,
            ...basePagination
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/applications/${args.applicationId}/snapshots`, args, basePaginationKeys)
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_list_team_application_statuses',
        title: 'List Team Application Statuses',
        description: `FlowFuse platform automation tool:
            Lists the applications in a team along with the live status of their associated hosted instances and remote instances.
            Use this to get a status overview across an entire team without querying each application individually.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            associationsLimit: z.number().optional().describe('Maximum number of associated instances and devices to include per application')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/applications/status`, args, ['associationsLimit'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    }
]
