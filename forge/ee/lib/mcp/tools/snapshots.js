const { z } = require('zod')

const { basePaginationKeys, limitParam, appendQuery, hostedInstanceId, snapshotId } = require('../schemas')
const { blankHiddenEnvValues } = require('../utils')

module.exports = [
    {
        name: 'platform_list_instance_snapshots',
        title: 'List Instance Snapshots',
        description: `FlowFuse platform automation tool:
            Lists the snapshots taken from a hosted instance or a remote instance (device).
            A snapshot is like a saved photo of everything running on the instance at a point in time: the flows, the settings, and the configuration.
            Set instanceType to "hosted" or "remote" to say which kind of instance instanceId refers to.
            Use this when you need to see what snapshots exist for an instance, for example to pick one to deploy or to check what changed between versions.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            instanceType: z.enum(['hosted', 'remote']).describe('Which kind of instance instanceId refers to: "hosted" for a hosted instance, "remote" for a remote instance (device)'),
            instanceId: z.string().describe('The ID of the instance whose snapshots to list (UUID for a hosted instance, hashid for a remote instance)'),
            cursor: z.string().optional().describe('Cursor for pagination (the hashid of the last item from the previous page)'),
            ...limitParam
        },
        handler: async (args, { inject }) => {
            const base = args.instanceType === 'hosted'
                ? `/api/v1/projects/${args.instanceId}/snapshots`
                : `/api/v1/devices/${args.instanceId}/snapshots`
            const url = appendQuery(base, args, basePaginationKeys)
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_create_instance_snapshot',
        title: 'Create Instance Snapshot',
        description: `FlowFuse platform automation tool:
            Creates a new snapshot from a hosted instance or a remote instance (device), capturing everything it is running right now (flows, settings, and configuration).
            Think of it as taking a photo of the instance so you can go back to this exact state later or deploy it elsewhere.
            Set instanceType to "hosted" or "remote" to say which kind of instance instanceId refers to.
            When instanceType is "remote", the device must be online and running or this will fail; call platform_get_remote_instance_status first to check.
            Use this when the user wants to save the current state of an instance before making changes, or to create a version that can be rolled out elsewhere.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            instanceType: z.enum(['hosted', 'remote']).describe('Which kind of instance instanceId refers to: "hosted" for a hosted instance, "remote" for a remote instance (device)'),
            instanceId: z.string().describe('The ID of the instance to snapshot (UUID for a hosted instance, hashid for a remote instance)'),
            name: z.string().optional().describe('Name for the snapshot'),
            description: z.string().optional().describe('Description of the snapshot')
        },
        handler: async (args, { inject }) => {
            const payload = {}
            if (args.name) {
                payload.name = args.name
            }
            if (args.description) {
                payload.description = args.description
            }
            const url = args.instanceType === 'hosted'
                ? `/api/v1/projects/${args.instanceId}/snapshots`
                : `/api/v1/devices/${args.instanceId}/snapshots`
            const response = await inject({ method: 'POST', url, payload })
            return response
        }
    },
    {
        name: 'platform_get_snapshot',
        title: 'Get Snapshot',
        description: `FlowFuse platform automation tool:
            Gets a single snapshot's metadata (name, description, owner, timestamps) by its id.
            Works for snapshots owned by a hosted instance or a remote instance (device); the owner is resolved automatically from the snapshot, so you do not need to know which instance owns it.
            This returns metadata only. To retrieve the full snapshot content (flows, settings, and environment variables), use platform_get_snapshot_full.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            snapshotId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/snapshots/${args.snapshotId}` })
            return response
        }
    },
    {
        name: 'platform_get_snapshot_full',
        title: 'Get Snapshot Full Payload',
        description: `FlowFuse platform automation tool:
            Gets the full payload of a snapshot by its id: flows, runtime settings, and environment variables. Works for hosted and remote instance snapshots.
            Credentials are never included, and the values of hidden (secret) environment variables are blanked; their keys are still listed.
            This payload can be large, so only call this when the content is actually needed.
            Use platform_get_snapshot instead when only the snapshot name, description, or other metadata is required.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            snapshotId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/snapshots/${args.snapshotId}/full` })
            if (response.statusCode >= 400) {
                return response
            }
            const body = response.json()
            if (body.settings?.env) {
                body.settings.env = blankHiddenEnvValues(body.settings.env)
            }
            return { statusCode: response.statusCode, json: () => body }
        }
    },
    {
        name: 'platform_update_snapshot',
        title: 'Update Snapshot',
        description: `FlowFuse platform automation tool:
            Updates a snapshot's name and/or description. Works for snapshots owned by a hosted instance or a remote instance (device); the owner is resolved automatically from the snapshot.
            This is a partial update: only the fields you pass are changed, omitted fields keep their stored value.
            name, when passed, must be a non-empty string - the route rejects an empty name. Pass an empty string as description to clear it.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            snapshotId,
            name: z.string().min(1).optional().describe('New name for the snapshot. Must be non-empty when provided; omit to keep the current name'),
            description: z.string().optional().describe('New description for the snapshot. Pass an empty string to clear it; omit to keep the current description')
        },
        handler: async (args, { inject }) => {
            const payload = {}
            if (args.name !== undefined) {
                payload.name = args.name
            }
            if (args.description !== undefined) {
                payload.description = args.description
            }
            const response = await inject({ method: 'PUT', url: `/api/v1/snapshots/${args.snapshotId}`, payload })
            return response
        }
    },
    {
        name: 'platform_export_snapshot',
        title: 'Export Snapshot',
        description: `FlowFuse platform automation tool:
            Exports the full content of a snapshot (flows, credentials, settings, and environment variables) so it can be imported elsewhere with platform_import_snapshot. Works for snapshots owned by a hosted instance or a remote instance (device); the owner is resolved automatically from the snapshot.
            credentialSecret is always required, even when credentials are excluded via components - the route rejects the request with a 400 without it. The exported credentials are re-encrypted with this secret, and the SAME secret must be supplied when importing the result, so remember it.
            The export contains sensitive data: by default it includes the encrypted flow credentials and the values of ALL environment variables, including hidden (secret) ones. Use components to narrow what is included, for example envVars: "keys" to strip env values.
            Unlike platform_get_snapshot_full, this is treated as a write operation because it extracts credentials and secret values.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            snapshotId,
            credentialSecret: z.string().describe('Secret used to re-encrypt the exported credentials. Required on every export; the same secret is needed to import the result'),
            components: z.object({
                flows: z.boolean().optional().describe('Include flows in the export (default true). Excluding flows also excludes credentials'),
                credentials: z.boolean().optional().describe('Include the encrypted flow credentials (default true)'),
                envVars: z.union([z.enum(['all', 'keys']), z.literal(false)]).optional().describe('Environment variables to include: "all" keeps keys and values (default, exposes hidden values), "keys" keeps only the names, false removes them entirely')
            }).optional().describe('Optional selection of which snapshot components to include in the export')
        },
        handler: async (args, { inject }) => {
            const payload = { credentialSecret: args.credentialSecret }
            if (args.components !== undefined) {
                payload.components = args.components
            }
            const response = await inject({ method: 'POST', url: `/api/v1/snapshots/${args.snapshotId}/export`, payload })
            return response
        }
    },
    {
        name: 'platform_import_snapshot',
        title: 'Import Snapshot',
        description: `FlowFuse platform automation tool:
            Imports a previously exported snapshot into a hosted instance or a remote instance (device), creating a new snapshot owned by that target. The response is the new snapshot's metadata; importing does not deploy it.
            ownerId must match ownerType: pass the hosted instance UUID with ownerType "instance", or the device hashid with ownerType "device".
            credentialSecret is required when the snapshot contains encrypted credentials (a flows.credentials object with a "$" property) and credentials are not excluded via components. It must be the same secret used at export; a wrong secret fails with a 400 "Invalid credential secret". Credentials can only be imported in encrypted form.
            Use components to import selectively, for example envVars: "keys" to import env var names without their values.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            ownerId: z.string().describe('Target owner id: hosted instance (project) UUID when ownerType is "instance", or device hashid when ownerType is "device"'),
            ownerType: z.enum(['instance', 'device']).describe('Type of resource that will own the imported snapshot'),
            snapshot: z.object({
                name: z.string().describe('Name for the imported snapshot'),
                description: z.string().optional().describe('Description for the imported snapshot (defaults to empty)'),
                flows: z.object({
                    flows: z.array(z.any()).describe('Node-RED flows array'),
                    credentials: z.record(z.string(), z.any()).optional().describe('Encrypted credentials object, as produced by platform_export_snapshot')
                }).describe('Flows payload'),
                settings: z.object({
                    settings: z.record(z.string(), z.any()).optional().describe('Runtime settings'),
                    env: z.record(z.string(), z.any()).optional().describe('Environment variables (defaults to none)'),
                    modules: z.record(z.string(), z.any()).optional().describe('Installed module versions')
                }).describe('Settings payload')
            }).describe('The snapshot content to import, typically the result of platform_export_snapshot'),
            credentialSecret: z.string().optional().describe('Secret to decrypt the snapshot credentials: the secret used when the snapshot was exported. Required when the snapshot contains credentials'),
            components: z.object({
                flows: z.boolean().optional().describe('Import flows (default true). Excluding flows also excludes credentials'),
                credentials: z.boolean().optional().describe('Import the flow credentials (default true)'),
                envVars: z.union([z.enum(['all', 'keys']), z.literal(false)]).optional().describe('Environment variables to import: "all" keeps keys and values (default), "keys" keeps only the names, false skips them')
            }).optional().describe('Optional selection of which snapshot components to import')
        },
        handler: async (args, { inject }) => {
            // The import route errors when settings.env is missing entirely, so
            // normalise an omitted env to the empty set the route expects.
            const snapshot = { ...args.snapshot, settings: { ...args.snapshot?.settings } }
            if (!snapshot.settings.env) {
                snapshot.settings.env = {}
            }
            const payload = { ownerId: args.ownerId, ownerType: args.ownerType, snapshot }
            if (args.credentialSecret !== undefined) {
                payload.credentialSecret = args.credentialSecret
            }
            if (args.components !== undefined) {
                payload.components = args.components
            }
            const response = await inject({ method: 'POST', url: '/api/v1/snapshots/import', payload })
            return response
        }
    },
    {
        name: 'platform_set_instance_device_target',
        title: 'Set Hosted Instance Device Target Snapshot',
        description: `FlowFuse platform automation tool:
            Sets the target snapshot for the remote instances (devices) assigned to a hosted instance.
            CAUTION: this takes effect immediately - every device assigned to the instance is told to deploy the target snapshot as soon as it is set. Confirm with the user before calling this.
            The snapshot must belong to the given hosted instance, otherwise the route rejects it with "invalid_snapshot". This tool can only set a target, not clear one.
            Use platform_get_hosted_instance_device_target_snapshot to see the current target, and platform_list_instance_snapshots to find a snapshot id.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            hostedInstanceId,
            snapshotId: snapshotId.describe('The hashid of the snapshot to set as the device target. Must be a snapshot of this hosted instance')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'POST', url: `/api/v1/projects/${args.hostedInstanceId}/devices/settings`, payload: { targetSnapshot: args.snapshotId } })
            return response
        }
    },
    {
        name: 'platform_get_hosted_instance_device_target_snapshot',
        title: 'Get Hosted Instance Device Target Snapshot',
        description: `FlowFuse platform automation tool:
            Gets the target snapshot for the remote instances (devices) assigned to a hosted instance: the snapshot those devices are set to deploy. Returns null when no target snapshot is set.
            Use this to check which snapshot the instance's assigned devices will run next.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/devices/settings` })
            return response
        }
    }
]
