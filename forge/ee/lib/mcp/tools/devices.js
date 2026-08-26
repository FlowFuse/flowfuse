const { z } = require('zod')

const { teamId, limitParam, pageParam } = require('../schemas')

module.exports = [
    {
        name: 'platform_list_remote_instances',
        title: 'List Remote Instances',
        description: `FlowFuse platform automation tool:
            Lists remote instances, either across a whole team, narrowed down to one application, or narrowed down to one hosted instance's device group.
            Remote instances are sometimes referred to as devices.
            A remote instance is a Node-RED that runs on the user's own hardware (like a Raspberry Pi or an edge server) rather than on the same environment as the FlowFuse platform.
            Pass applicationId to list only the remote instances assigned to one application, or hostedInstanceId to list only the remote instances assigned to one hosted instance's device group. Omit both to list every remote instance in the team.
            You can search by name using the query parameter, filter by mode ("autonomous", i.e. Fleet Mode, or "developer", i.e. Developer Mode), and page through results using page and limit.
            To get the full details of one specific remote instance, call platform_get_remote_instance with its ID.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().describe('The hashid of the team'),
            applicationId: z.string().optional().describe('Restrict results to remote instances assigned to this application. Omit to list every remote instance in the team.'),
            hostedInstanceId: z.string().optional()
                .describe('Restrict results to remote instances assigned to this hosted instance\'s device group (i.e. remote instances whose ownerType is "instance"). Takes priority over applicationId if both are set.'),
            query: z.string().optional().describe('Search remote instances by name or type'),
            mode: z.enum(['autonomous', 'developer']).optional()
                .describe('Filter by mode: "autonomous" (Fleet Mode, running its assigned snapshot independently) or "developer" (Developer Mode, connected to the editor for live development). Matches the dashboard\'s own mode filter.'),
            ...pageParam,
            ...limitParam
        },
        handler: async (args, { inject, app }) => {
            const params = new URLSearchParams({
                page: String(args.page || 1),
                limit: String(args.limit || 10)
            })
            if (args.query) {
                params.set('query', args.query)
            }
            if (args.mode) {
                params.set('filters', `mode:${args.mode}`)
            }
            const basePath = args.hostedInstanceId
                ? `/api/v1/projects/${args.hostedInstanceId}/devices`
                : args.applicationId
                    ? `/api/v1/applications/${args.applicationId}/devices`
                    : `/api/v1/teams/${args.teamId}/devices`
            const url = `${basePath}?${params}`

            const response = await inject({ method: 'GET', url })
            if (response.statusCode >= 400) {
                return response
            }

            const body = response.json()
            const devices = await Promise.all((body.devices || []).map(async (device) => {
                const cachedLiveState = app ? await app.db.controllers.Device.getLiveCachedState(device.id) : null

                return {
                    id: device.id,
                    name: device.name,
                    ownerType: device.ownerType,
                    mode: device.mode,
                    requiredStatus: device.status,
                    liveStatus: cachedLiveState || device.onlineStatus,
                    lastSeenAt: device.lastSeenAt,
                    lastSeenMs: device.lastSeenMs,
                    team: device.team ? { id: device.team.id, name: device.team.name } : undefined,
                    application: device.application ? { id: device.application.id, name: device.application.name } : undefined
                }
            }))

            return {
                statusCode: response.statusCode,
                json: () => ({
                    count: body.meta?.total ?? body.count,
                    meta: { page: body.meta?.page, pageSize: body.meta?.pageSize, total: body.meta?.total, pageCount: body.meta?.pageCount },
                    devices
                })
            }
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
            If you need to list all remote instances first, call platform_list_remote_instances.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            remoteInstanceId: z.string().describe('The hashid of the remote instance')
        },
        handler: async (args, { inject, app }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/devices/${args.remoteInstanceId}` })

            if (response.statusCode >= 400) {
                return response
            }

            const body = response.json()
            const { status, onlineStatus } = body
            delete body.onlineStatus
            delete body.status

            const cachedLiveState = app ? await app.db.controllers.Device.getLiveCachedState(args.remoteInstanceId) : null

            return {
                statusCode: response.statusCode,
                json: () => ({
                    ...body,
                    requiredStatus: status,
                    liveStatus: cachedLiveState || onlineStatus
                })
            }
        }
    },
    {
        name: 'platform_get_remote_instance_status',
        title: 'Get Remote Instance Status',
        description: `FlowFuse platform automation tool:
            Gets the running status of a remote instance: the state of the Node-RED runtime on the device
            (running, stopped, installing, etc.).
            The platform keeps a short-lived cache of each device's reported state. This tool returns that cached
            value when one is present, and only queries the device directly over MQTT on a cache miss, so a result
            can be a few seconds old rather than sampled at the instant you asked.
            The remote instance must be online and reachable for this to work. If the device is offline, the call will time out.
            Use this when you need to know what the device is actually doing right now.
            Other tools like platform_create_instance_snapshot (for a remote instance) require the device to be running.
            Always call this tool first to verify the device is live before using those tools.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().describe('The hashid of the team that owns the remote instance. You can get this from platform_get_remote_instance or ui_get_context.'),
            remoteInstanceId: z.string().describe('The hashid of the remote instance')
        },
        handler: async (args, { app }) => {
            if (!app.comms?.devices) {
                return { error: 'Device communications not available' }
            }
            try {
                if (app) {
                    const liveCachedState = await app.db.controllers.Device.getLiveCachedState(args.remoteInstanceId)
                    if (liveCachedState) {
                        return liveCachedState
                    }
                }

                const response = await app.comms.devices.sendCommandAwaitReply(args.teamId, args.remoteInstanceId, 'get-liveState', {}, { timeout: 3000 })
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
            If the user named an application for this device, call platform_assign_remote_instance_to_application immediately after creation. If not, ask before assigning. A best practice is to always assign the remote instance to an application.
            After the device is created, ask the user if they want to be taken to it. If they do, use the ui_navigate tool with the route name "device-overview" and params { id: <the new device id> }.`,
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
            name: z.string().describe('Name for the new remote instance'),
            teamId: z.string().describe('The hashid of the team to register the device in'),
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
            remoteInstanceId: z.string().describe('The hashid of the remote instance'),
            applicationId: z.string().describe('The hashid of the application to assign it to')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'PUT', url: `/api/v1/devices/${args.remoteInstanceId}`, payload: { application: args.applicationId } })
            return response
        }
    },
    {
        name: 'platform_list_team_provisioning_tokens',
        title: 'List Team Provisioning Tokens',
        description: `FlowFuse platform automation tool:
            Lists a team's device provisioning tokens. This summary view omits the token secret.
            Use this to see what provisioning tokens exist for a team without exposing their secrets.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/devices/provisioning` })
            return response
        }
    }
]
