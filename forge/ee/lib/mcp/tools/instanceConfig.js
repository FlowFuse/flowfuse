const { z } = require('zod')

const { hostedInstanceId, remoteInstanceId } = require('../schemas')

module.exports = [
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
