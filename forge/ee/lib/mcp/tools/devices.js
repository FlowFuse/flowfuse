const { z } = require('zod')

const { remoteInstanceId, basePagination, basePaginationKeys, searchQuery, searchQueryKeys, auditLogFilters, auditLogFilterKeys, appendQuery } = require('../schemas')

// Audit-log routes accept cursor+limit pagination, free-text query, event
// (single name or array) and username. The device audit-log route has no scope
// parameter, so these tools only compose the base audit-log fragments.
const auditLogInput = { ...basePagination, ...searchQuery, ...auditLogFilters }
const auditLogKeys = [...basePaginationKeys, ...searchQueryKeys, ...auditLogFilterKeys]

module.exports = [
    {
        name: 'platform_list_team_remote_instances',
        title: 'List Team Remote Instances',
        description: `FlowFuse platform automation tool:
            Lists all remote instances that belong to a team.
            Remote instances are sometimes referred to as devices.
            A remote instance is a Node-RED that runs on the user's own hardware (like a Raspberry Pi or an edge server) rather than on the same environment as the FlowFuse platform.
            Use this when you need to see all the remote instances a team has, regardless of which application they belong to.
            If you already know the application, use platform_get_application_remote_instances instead to get a narrower list.
            To get the full details of one specific remote instance, call platform_get_remote_instance with its ID.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().describe('The ID or hashid of the team'),
            query: z.string().optional().describe('Search remote instances by name or type'),
            cursor: z.string().optional().describe('Cursor for pagination (the hashid of the last item from the previous page)'),
            limit: z.number().min(1).max(10).describe('How many results to return per page')
        },
        handler: async (args, { inject }) => {
            let url = `/api/v1/teams/${args.teamId}/devices`
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
        name: 'platform_get_remote_instance',
        title: 'Get Remote Instance',
        description: `FlowFuse platform automation tool:
            Gets the full details of one specific remote instance.
            Remote instances are sometimes referred to as devices.
            Use this when you already have a remote instance ID and need to know everything about it:
            its name, online/offline status, which application and team it belongs to, what device group it is in,
            what snapshot it is currently running, and what snapshot it should be running (the target).
            If you need to list all remote instances first, call platform_list_remote_instances or platform_get_application_remote_instances.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            remoteInstanceId: z.string().describe('The ID or hashid of the remote instance')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/devices/${args.remoteInstanceId}` })
            return response
        }
    },
    {
        name: 'platform_get_remote_instance_status',
        title: 'Get Remote Instance Status',
        description: `FlowFuse platform automation tool:
            Gets the live running status of a remote instance by querying the device directly over MQTT.
            This returns the real-time state of the Node-RED runtime on the device (running, stopped, installing, etc.),
            not the last-known state stored on the platform.
            The remote instance must be online and reachable for this to work. If the device is offline, the call will time out.
            Use this when you need to know what the device is actually doing right now.
            Other tools like platform_create_remote_instance_snapshot require the device to be running.
            Always call this tool first to verify the device is live before using those tools.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().describe('The hashid of the team that owns the remote instance. You can get this from platform_get_remote_instance or ui_get_context.'),
            remoteInstanceId: z.string().describe('The ID or hashid of the remote instance')
        },
        handler: async (args, { comms }) => {
            if (!comms) {
                return { error: 'Device communications not available' }
            }
            try {
                const response = await comms.sendCommandAwaitReply(args.teamId, args.remoteInstanceId, 'get-liveState', {}, { timeout: 3000 })
                return {
                    state: response?.state || 'unknown',
                    health: response?.health ?? null,
                    snapshot: response?.snapshot ?? null
                }
            } catch (err) {
                return { error: 'Device is not reachable. It may be offline or not connected to the platform.' }
            }
        }
    },
    {
        name: 'platform_create_remote_instance',
        title: 'Create Remote Instance',
        description: `FlowFuse platform automation tool:
            Registers a new remote instance (device) in a team.
            A remote instance is a Node-RED that runs on the user's own hardware rather than on the same environment as the FlowFuse platform.
            This only registers the device on the platform, it does not install anything on the user's hardware.
            The response includes credentials that the user will need to configure on their device to connect it to the platform.
            If the user wants to assign it to an application, call platform_assign_remote_instance_to_application after creation.
            After the device is created, ask the user if they want to be taken to it. If they do, use the ui_navigate tool with the route name "device-overview" and params { id: <the new device id> }.`,
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
            name: z.string().describe('Name for the new remote instance'),
            teamId: z.string().describe('The ID or hashid of the team to register the device in'),
            type: z.string().optional().describe('Optional label describing the device type (e.g. "Raspberry Pi 4", "Edge Gateway")')
        },
        handler: async (args, { inject }) => {
            const payload = { name: args.name, team: args.teamId, type: args.type || '' }
            const response = await inject({ method: 'POST', url: '/api/v1/devices', payload })
            return response
        }
    },
    {
        name: 'platform_assign_remote_instance_to_application',
        title: 'Assign Remote Instance To Application',
        description: `FlowFuse platform automation tool:
            Assigns a remote instance to an application.
            Use this after creating a remote instance with platform_create_remote_instance, or to move an existing remote instance into a different application.
            The remote instance and the application must belong to the same team.`,
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
            remoteInstanceId: z.string().describe('The ID or hashid of the remote instance'),
            applicationId: z.string().describe('The ID or hashid of the application to assign it to')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'PUT', url: `/api/v1/devices/${args.remoteInstanceId}`, payload: { application: args.applicationId } })
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
        name: 'platform_list_remote_instance_http_tokens',
        title: 'List Remote Instance HTTP Tokens',
        description: `FlowFuse platform automation tool:
            Lists the HTTP bearer tokens configured for a remote instance (device).
            These tokens are used by external callers to authenticate HTTP requests handled by the
            remote instance's Node-RED flows.
            HTTP bearer tokens are a plan-gated feature: a team without it enabled gets a 404 error.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            remoteInstanceId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/devices/${args.remoteInstanceId}/httpTokens` })
            return response
        }
    }
]
