const { z } = require('zod')

const { teamId, applicationId, hostedInstanceId, remoteInstanceId, basePagination, basePaginationKeys, searchQuery, searchQueryKeys, auditLogFilters, auditLogFilterKeys, appendQuery } = require('../schemas')

// Audit-log routes accept cursor+limit pagination, free-text query, event
// (single name or array) and username. scope narrows which entity levels are
// returned and its allowed values differ per route (the device route has none);
// includeChildren pulls in descendant entries within the chosen scope.
const includeChildren = z.boolean().optional().describe('Also include audit entries from child entities within the chosen scope')
const auditLogInput = { ...basePagination, ...searchQuery, ...auditLogFilters }
const auditLogKeys = [...basePaginationKeys, ...searchQueryKeys, ...auditLogFilterKeys]

module.exports = [
    {
        name: 'platform_get_team_audit_log',
        title: 'Get Team Audit Log',
        description: `FlowFuse platform automation tool:
            Reads the audit log for a team, showing events like membership changes, billing changes,
            and administrative actions taken across the team's applications, instances, and devices.
            A team-scoped PAT only sees audit log entries for teams it is scoped to.
            Use this when the user asks what happened on a team, or wants to investigate recent changes.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            ...auditLogInput,
            scope: z.enum(['team', 'application', 'project', 'device']).optional().describe('Entity level to include (default team)'),
            includeChildren
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/audit-log`, args, [...auditLogKeys, 'scope', 'includeChildren'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_export_team_audit_log',
        title: 'Export Team Audit Log',
        description: `FlowFuse platform automation tool:
            Exports the team audit log as a CSV file.
            Use this when the user wants a downloadable or shareable copy of the team's audit history,
            rather than reading entries directly with platform_get_team_audit_log.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId,
            ...auditLogInput,
            scope: z.enum(['team', 'application', 'project', 'device']).optional().describe('Entity level to include (default team)'),
            includeChildren
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/audit-log/export`, args, [...auditLogKeys, 'scope', 'includeChildren'])
            const response = await inject({ method: 'GET', url })
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
        name: 'platform_get_remote_instance_audit_log',
        title: 'Get Remote Instance Audit Log',
        description: `FlowFuse platform automation tool:
            Reads the audit log for a remote instance/device, showing events like connection changes,
            deployments, and configuration changes for that device.
            Use this when the user wants to know what has happened to a specific remote instance.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            remoteInstanceId,
            ...auditLogInput
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/devices/${args.remoteInstanceId}/audit-log`, args, auditLogKeys)
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_export_remote_instance_audit_log',
        title: 'Export Remote Instance Audit Log',
        description: `FlowFuse platform automation tool:
            Exports a remote instance/device audit log as a CSV file.
            Use this when the user wants a downloadable or shareable copy of the device's audit history,
            rather than reading entries directly with platform_get_remote_instance_audit_log.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            remoteInstanceId,
            ...auditLogInput
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/devices/${args.remoteInstanceId}/audit-log/export`, args, auditLogKeys)
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_export_application_audit_log',
        title: 'Export Application Audit Log',
        description: `FlowFuse platform automation tool:
            Exports an application audit log as a CSV file.
            Use this when the user wants a downloadable or shareable copy of the application's audit history.
            To read audit log entries directly instead, use the application audit log read tool.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            applicationId,
            ...auditLogInput,
            scope: z.enum(['application', 'project', 'device']).optional().describe('Entity level to include (default application)'),
            includeChildren
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/applications/${args.applicationId}/audit-log/export`, args, [...auditLogKeys, 'scope', 'includeChildren'])
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
        name: 'platform_get_remote_instance_history',
        title: 'Get Remote Instance History',
        description: `FlowFuse platform automation tool:
            Reads a timeline of changes made to a remote instance/device over time.
            This is plan-gated on the projectHistory feature, which defaults to enabled;
            if the team's plan has this feature disabled, the tool reports that device history
            is not enabled for this team rather than a bare not-found error.
            Use this when the user wants a chronological view of what changed on a device.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            remoteInstanceId,
            ...basePagination
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/devices/${args.remoteInstanceId}/history`, args, basePaginationKeys)
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
        name: 'platform_get_team_bom',
        title: 'Get Team Bill of Materials',
        description: `FlowFuse platform automation tool:
            Reads the bill of materials for a team: the applications, instances, and their
            dependencies across the team. This is plan-gated on the bom feature, which defaults
            to disabled; if disabled for the team, the tool reports that the bill of materials
            is not enabled for this team rather than the raw platform error.
            Results are filtered to the applications the calling token can access,
            so a scoped token sees only its in-scope subset instead of an error.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/bom` })
            return response
        }
    },
    {
        name: 'platform_get_application_bom',
        title: 'Get Application Bill of Materials',
        description: `FlowFuse platform automation tool:
            Reads the bill of materials for a single application: its instances and their dependencies.
            This is plan-gated on the bom feature, which defaults to disabled; if the team's plan
            has this feature disabled, the tool reports that the bill of materials is not enabled
            for this team rather than the raw platform error.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            applicationId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/applications/${args.applicationId}/bom` })
            return response
        }
    }
]
