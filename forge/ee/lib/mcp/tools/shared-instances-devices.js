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
    }
]
