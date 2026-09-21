const { z } = require('zod')

const { basePaginationKeys, limitParam, appendQuery, hostedInstanceId, snapshotId, snapshotComponents, toolError } = require('../schemas')
const { blankHiddenEnvValues } = require('../utils')

// Width of ProjectSnapshot.name, a DataTypes.STRING column.
const SNAPSHOT_NAME_MAX_LENGTH = 255

// An env var in a snapshot is either a plain value or an object carrying the
// hidden flag, with "$" holding the encrypted value once it has been exported.
// Spelling the shape out keeps null and other scalars from reaching the import
// route, which reads every value's properties unguarded.
const envVarValue = z.union([
    z.string(),
    z.object({
        value: z.string().optional().describe('The value, for an env var that is not hidden or has been decrypted'),
        hidden: z.boolean().optional().describe('Whether this is a secret env var'),
        $: z.string().optional().describe('The encrypted value, as produced by platform_export_snapshot')
    }).loose()
])

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
            This is a partial update: only the fields you pass are changed, omitted fields keep their stored value. Pass at least one of name or description.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            snapshotId,
            name: z.string().min(1).max(SNAPSHOT_NAME_MAX_LENGTH).optional().describe(`New name for the snapshot. Must be non-empty and at most ${SNAPSHOT_NAME_MAX_LENGTH} characters when provided; omit to keep the current name`),
            description: z.string().optional().describe('New description for the snapshot. Pass an empty string to clear it; omit to keep the current description')
        },
        handler: async (args, { inject }) => {
            // Tool input is not validated platform-side, so the schema's own
            // constraints are advisory. The controller throws a sequelize
            // ValidationError for a blank name and nothing maps that to a status,
            // so an empty name would surface as a 500 rather than a usable error.
            if (args.name !== undefined && args.name.trim() === '') {
                return toolError(400, 'invalid_request', 'name must be a non-empty string; omit it to keep the current name')
            }
            // The name column is 255 wide, and an over-long value surfaces as a 500
            // carrying the raw database error. Note this only bites on postgres:
            // sqlite ignores the declared width, so it passes there.
            if (args.name !== undefined && args.name.length > SNAPSHOT_NAME_MAX_LENGTH) {
                return toolError(400, 'invalid_request', `name must be ${SNAPSHOT_NAME_MAX_LENGTH} characters or fewer`)
            }
            const payload = {}
            if (args.name !== undefined) {
                payload.name = args.name
            }
            if (args.description !== undefined) {
                payload.description = args.description
            }
            // The route replies 200 with the unchanged snapshot when there is
            // nothing to update, which reads as a successful edit that never happened.
            if (Object.keys(payload).length === 0) {
                return toolError(400, 'invalid_request', 'Pass at least one of name or description to update')
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
            Environment variables whose names start with FF_ are reserved by the platform and are never included in an export.
            Unless credentials are excluded (components credentials: false or flows: false), the export carries an encrypted credentials block even when the snapshot has no flows and no credentials at all, so platform_import_snapshot will need this same secret to take the result back in.
            This payload can be large, and is always a superset of platform_get_snapshot_full, so only call it when the exported content is actually needed.
            Unlike platform_get_snapshot_full, this is treated as a write operation because it extracts credentials and secret values.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            snapshotId,
            credentialSecret: z.string().min(1).describe('Secret used to re-encrypt the exported credentials. Required on every export; the same secret is needed to import the result'),
            components: snapshotComponents
        },
        handler: async (args, { inject }) => {
            // The route treats a blank secret as an absent one and answers 400.
            // Schema constraints are advisory platform-side, so check it here too.
            if (!args.credentialSecret) {
                return toolError(400, 'invalid_request', 'credentialSecret is required and must not be empty')
            }
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
            Pass the result of platform_export_snapshot straight through as snapshot; the extra fields an export carries (id, createdAt, updatedAt, ownerType, user, exportedBy) are accepted and ignored.
            ownerId must match ownerType: pass the hosted instance UUID with ownerType "instance", or the device hashid with ownerType "device".
            credentialSecret must be the same secret used at export. Every snapshot produced by platform_export_snapshot carries an encrypted credentials block, even one with no flows and no credentials, so a secret is in practice always required for an export. It can only be left out for a hand-built snapshot with no encrypted material, or when credentials are excluded with components flows: false or credentials: false. Hidden environment variable values (env entries carrying a "$" property) need it too, unless env vars are dropped with envVars: false or reduced to their names with envVars: "keys".
            A wrong secret is only detected through flow credentials (400 "Invalid credential secret"); when no flow credentials are imported, a wrong secret cannot be detected and hidden env values import as corrupted data, so double-check the secret first.
            Flow credentials must be encrypted: pass the credentials object from an export, carrying a single "$" property. Unencrypted credentials are rejected, because the platform stores them exactly as given and they would sit in the clear.
            Environment variables whose names start with FF_ are reserved by the platform and are dropped on import, so they will not appear in the created snapshot.
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
                    env: z.record(z.string(), envVarValue).optional().describe('Environment variables, either "NAME": "value" or "NAME": { "value": "...", "hidden": true } for secrets (defaults to none)'),
                    modules: z.record(z.string(), z.any()).optional().describe('Installed module versions')
                }).describe('Settings payload')
            // Loose so an export can be handed over untouched: it carries id,
            // createdAt, updatedAt, ownerType, user and exportedBy on top of the
            // four fields the route reads. The handler forwards only those four.
            }).loose().describe('The snapshot content to import, typically the result of platform_export_snapshot'),
            credentialSecret: z.string().optional().describe('Secret to decrypt the snapshot: the secret used when the snapshot was exported. Required when the snapshot contains encrypted flow credentials or hidden env values'),
            components: snapshotComponents
        },
        handler: async (args, { inject }) => {
            // Forward only the four fields the route reads, so the export metadata
            // the schema now tolerates is not echoed back into the request body.
            const { name, description, flows, settings } = args.snapshot || {}
            const snapshot = { name, flows: { ...flows }, settings: { ...settings } }
            if (description !== undefined) {
                snapshot.description = description
            }

            // Excluding the flows drops the credentials along with them, but the
            // route guards on the payload as given, so it asks for a secret it will
            // never use. Strip them here the way excluded env vars are stripped below.
            const credentialsExcluded = args.components?.flows === false || args.components?.credentials === false
            if (credentialsExcluded) {
                snapshot.flows.credentials = {}
            }

            // The import route errors when settings.env is missing entirely, so
            // normalise an omitted env to the empty set the route expects. Excluded
            // env vars are stripped up front too: the route empties them anyway, but
            // only after decrypting hidden values, which fails without the secret.
            if (!snapshot.settings.env || args.components?.envVars === false) {
                snapshot.settings.env = {}
            } else if (args.components?.envVars === 'keys') {
                // Same story for a keys-only import: the route keeps the names and
                // discards every value, but decrypts the hidden ones first. Reducing
                // to the names here produces the identical result without a secret.
                snapshot.settings.env = Object.keys(snapshot.settings.env).reduce((acc, key) => {
                    acc[key] = ''
                    return acc
                }, {})
            }

            // The route reads every env value's properties without checking it is
            // an object, so a null slips through to a 500. The schema rules those
            // out at the gateway; this covers callers the schema does not reach.
            const invalidEnv = Object.keys(snapshot.settings.env).find(key => {
                const value = snapshot.settings.env[key]
                return value === null || (typeof value !== 'string' && typeof value !== 'object')
            })
            if (invalidEnv) {
                return toolError(400, 'invalid_request', `settings.env.${invalidEnv} must be a string or an object; the platform errors on any other value`)
            }

            // Credentials are only re-encrypted for the target when they arrive
            // encrypted; anything else is written to the snapshot verbatim and ends
            // up stored in the clear, so reject it rather than leak it into the database.
            const credentials = snapshot.flows.credentials
            if (credentials && !credentials.$ && Object.keys(credentials).length > 0) {
                return toolError(400, 'invalid_request', 'flows.credentials must be the encrypted object produced by platform_export_snapshot, carrying a single "$" property; unencrypted credentials would be stored in the clear')
            }

            // The route only guards flow credentials before decrypting; a missing
            // secret with encrypted hidden env values surfaces as a 500, so reject
            // both encrypted cases here with a clear error instead.
            const hasEncryptedEnv = Object.values(snapshot.settings.env).some(env => env && typeof env === 'object' && env.hidden && env.$)
            const hasEncryptedCredentials = !credentialsExcluded && !!credentials?.$
            if ((hasEncryptedEnv || hasEncryptedCredentials) && !args.credentialSecret) {
                return toolError(400, 'invalid_request', 'credentialSecret is required: the snapshot contains encrypted flow credentials or hidden environment variable values')
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
        // destructiveHint: this overwrites what every assigned device is running,
        // rather than adding to it, so it belongs behind destructive tool access.
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
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
