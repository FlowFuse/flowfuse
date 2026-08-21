const { z } = require('zod')

const { basePagination, basePaginationKeys, appendQuery } = require('../schemas')

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
        annotations: { readOnlyHint: true, destructiveHint: false },
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
        annotations: { readOnlyHint: true, destructiveHint: false },
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
    }
]
