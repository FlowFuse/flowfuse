const { z } = require('zod')

const { basePagination, basePaginationKeys, searchQuery, searchQueryKeys, auditLogFilters, auditLogFilterKeys, appendQuery, toolError } = require('../schemas')

// Tools that work against both hosted instances and remote instances (devices),
// selected with an instanceType discriminator.
module.exports = [
    {
        name: 'platform_list_instance_http_tokens',
        title: 'List Instance HTTP Tokens',
        description: `FlowFuse platform automation tool:
            Lists the HTTP bearer tokens configured for an instance, either a hosted instance or a remote instance (device).
            These tokens are used by external callers to authenticate HTTP requests handled by the
            instance's Node-RED flows.
            HTTP bearer tokens are a plan-gated feature: a team without it enabled gets a 404 error.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            instanceId: z.string().describe('The ID of the instance (hosted instance UUID, or remote instance/device hashid)'),
            instanceType: z.enum(['hosted', 'remote']).describe('Whether instanceId refers to a hosted instance ("hosted") or a remote instance/device ("remote")')
        },
        handler: async (args, { inject }) => {
            const base = args.instanceType === 'remote' ? 'devices' : 'projects'
            const response = await inject({ method: 'GET', url: `/api/v1/${base}/${args.instanceId}/httpTokens` })
            return response
        }
    },
    {
        name: 'platform_get_instance_history',
        title: 'Get Instance History',
        description: `FlowFuse platform automation tool:
            Reads a timeline of changes made to an instance over time, for either a hosted instance or a remote instance (device).
            This is plan-gated on the projectHistory feature, which defaults to enabled; if the team's plan has this feature disabled, the call returns a not-found error.
            Use this when the user wants a chronological view of what changed on an instance.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            instanceId: z.string().describe('The ID of the instance (hosted instance UUID, or remote instance/device hashid)'),
            instanceType: z.enum(['hosted', 'remote']).describe('Whether instanceId refers to a hosted instance ("hosted") or a remote instance/device ("remote")'),
            ...basePagination
        },
        handler: async (args, { inject }) => {
            const base = args.instanceType === 'remote' ? 'devices' : 'projects'
            const url = appendQuery(`/api/v1/${base}/${args.instanceId}/history`, args, basePaginationKeys)
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_get_instance_audit_log',
        title: 'Get Instance Audit Log',
        description: `FlowFuse platform automation tool:
            Reads the audit log for an instance, either a hosted instance or a remote instance (device), showing events like deployments, restarts, connection changes, settings changes, and other actions taken against that instance.
            Use this when the user wants to know what has happened to a specific instance.
            Results are cursor-paginated and can be narrowed with query, event and username.
            scope and includeChildren apply only to hosted instances: by default only the instance's own ("project") entries are returned; set scope to "device" to read the entries for its assigned devices instead, and set includeChildren to also include entries from child entities within the chosen scope. A remote instance has no child entities, so these two parameters are rejected when instanceType is "remote".`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            instanceId: z.string().describe('The ID of the instance (hosted instance UUID, or remote instance/device hashid)'),
            instanceType: z.enum(['hosted', 'remote']).describe('Whether instanceId refers to a hosted instance ("hosted") or a remote instance/device ("remote")'),
            ...basePagination,
            ...searchQuery,
            ...auditLogFilters,
            scope: z.enum(['project', 'device']).optional().describe('Hosted instances only. Entity level to read entries for: "project" (the instance itself, the default) or "device" (its assigned devices)'),
            includeChildren: z.boolean().optional().describe('Hosted instances only. Also include audit entries from child entities within the chosen scope')
        },
        handler: async (args, { inject }) => {
            if (args.instanceType === 'remote') {
                const hostedOnly = ['scope', 'includeChildren'].filter((key) => args[key] !== undefined)
                if (hostedOnly.length > 0) {
                    return toolError(400, 'invalid_request', `${hostedOnly.join(', ')} can only be used with hosted instances. Remove these parameters to read a remote instance audit log.`)
                }
            }
            const base = args.instanceType === 'remote' ? 'devices' : 'projects'
            const keys = [...basePaginationKeys, ...searchQueryKeys, ...auditLogFilterKeys, 'scope', 'includeChildren']
            const url = appendQuery(`/api/v1/${base}/${args.instanceId}/audit-log`, args, keys)
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_instance_action',
        title: 'Instance Lifecycle Action',
        description: `FlowFuse platform automation tool:
            Applies a lifecycle action to an instance, changing whether and how it runs. Confirm with the user before stopping, suspending, or restarting anything.
            Hosted instances accept: start (resume a suspended instance, or start the flows of a stopped one), stop (stop the flows, container keeps running), restart (restart the flows), suspend (shut the container down entirely), and restartStack (suspend then relaunch the container, picking up stack changes). stop, restart, and suspend are rejected with a 400 "project_suspended" while the instance is suspended - use start to bring it back first.
            Remote instances (devices) accept only restart, which asks the device to restart Node-RED; the device must be online and reachable (400 "no_response" on timeout, "device_suspended" while suspended).
            stop, restart and suspend wait for the container operation before replying { status: "okay" }. Two do not: starting a SUSPENDED instance replies { status: "okay" } once the container launch has begun, and restartStack replies with an empty body the moment the relaunch starts. For those two, check platform_get_hosted_instance_status to confirm the final state.`,
        // destructiveHint: stop and suspend take the instance down, and restart interrupts whatever it is running.
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            instanceId: z.string().describe('The ID of the instance (hosted instance UUID, or remote instance/device hashid)'),
            instanceType: z.enum(['hosted', 'remote']).describe('Whether instanceId refers to a hosted instance ("hosted") or a remote instance/device ("remote")'),
            action: z.enum(['start', 'stop', 'restart', 'suspend', 'restartStack']).describe('Lifecycle action to apply. Remote instances accept only restart')
        },
        handler: async (args, { inject }) => {
            if (args.instanceType === 'remote' && args.action !== 'restart') {
                return toolError(400, 'invalid_request', `Remote instances (devices) only support the restart action, not ${args.action}. The other lifecycle actions apply to hosted instances only.`)
            }
            const url = args.instanceType === 'remote'
                ? `/api/v1/devices/${args.instanceId}/actions/restart`
                : `/api/v1/projects/${args.instanceId}/actions/${args.action}`
            const response = await inject({ method: 'POST', url })
            return response
        }
    },
    {
        name: 'platform_create_instance_http_token',
        title: 'Create Instance HTTP Token',
        description: `FlowFuse platform automation tool:
            Creates an HTTP bearer token for an instance (hosted instance or remote instance/device). External callers present these tokens to authenticate HTTP requests handled by the instance's Node-RED flows; they are not platform API tokens.
            The response includes the token value itself, and this is the ONLY time it is shown - relay it to the user immediately and treat it as a secret.
            HTTP bearer tokens are a plan-gated feature (the same gate as FlowFuse User Authentication); a team without it enabled gets a 404 error.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            instanceId: z.string().describe('The ID of the instance (hosted instance UUID, or remote instance/device hashid)'),
            instanceType: z.enum(['hosted', 'remote']).describe('Whether instanceId refers to a hosted instance ("hosted") or a remote instance/device ("remote")'),
            name: z.string().describe('Human-readable name for the token'),
            expiresAt: z.string().optional().describe('Token expiry as an ISO 8601 timestamp. Omit for a token that never expires')
        },
        handler: async (args, { inject }) => {
            const base = args.instanceType === 'remote' ? 'devices' : 'projects'
            const payload = { name: args.name }
            if (args.expiresAt !== undefined) {
                payload.expiresAt = args.expiresAt
            }
            const response = await inject({ method: 'POST', url: `/api/v1/${base}/${args.instanceId}/httpTokens`, payload })
            return response
        }
    },
    {
        name: 'platform_update_instance_http_token',
        title: 'Update Instance HTTP Token',
        description: `FlowFuse platform automation tool:
            Sets or clears the expiry of an existing HTTP bearer token on an instance (hosted instance or remote instance/device). The expiry is the only thing this can change: the token's name and value are fixed at creation.
            NOTE: omitting expiresAt does not leave the expiry unchanged - it CLEARS it, making the token never expire. Always pass expiresAt when the token should keep or gain an expiry.
            Find token ids with platform_list_instance_http_tokens. Tokens managed by the FlowFuse Expert cannot be modified.
            HTTP bearer tokens are a plan-gated feature; a team without it enabled gets a 404 error.`,
        // destructiveHint: omitting expiresAt clears the expiry, removing a security control from an existing token.
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            instanceId: z.string().describe('The ID of the instance (hosted instance UUID, or remote instance/device hashid)'),
            instanceType: z.enum(['hosted', 'remote']).describe('Whether instanceId refers to a hosted instance ("hosted") or a remote instance/device ("remote")'),
            tokenId: z.string().describe('The hashid of the token to update, as returned by platform_list_instance_http_tokens'),
            expiresAt: z.string().optional().describe('New expiry as an ISO 8601 timestamp. OMITTING THIS CLEARS THE EXPIRY, making the token never expire')
        },
        handler: async (args, { inject }) => {
            const base = args.instanceType === 'remote' ? 'devices' : 'projects'
            const payload = {}
            if (args.expiresAt !== undefined) {
                payload.expiresAt = args.expiresAt
            }
            const response = await inject({ method: 'PUT', url: `/api/v1/${base}/${args.instanceId}/httpTokens/${args.tokenId}`, payload })
            return response
        }
    }
]
