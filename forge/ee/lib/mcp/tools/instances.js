const { randomUUID } = require('crypto')

const { z } = require('zod')

const { teamId, applicationId, hostedInstanceId, searchQuery, sortParams, limitParam, pageParam, toolError } = require('../schemas')

// Mirrors the runningStates/errorStates/stoppedStates groups in frontend/src/composables/InstanceStates.js,
// the same grouping the dashboard's own Running/Error/Not Running status filter uses (frontend/src/pages/team/Instances.vue).
const STATE_GROUPS = {
    running: ['importing', 'connected', 'info', 'success', 'pushing', 'pulling', 'loading', 'updating', 'installing', 'safe', 'protected', 'running', 'warning', 'starting'],
    error: ['error', 'crashed'],
    notRunning: ['stopping', 'restarting', 'suspending', 'rollback', 'stopped', 'suspended', 'offline', 'unknown']
}

function expandStateGroups (groups) {
    return groups.flatMap((group) => STATE_GROUPS[group])
}

module.exports = [
    {
        name: 'platform_list_hosted_instances',
        title: 'List Hosted Instances',
        description: `FlowFuse platform automation tool:
            Lists hosted instances, either across a whole team or narrowed down to one application.
            A hosted instance is a Node-RED that runs on the same environment as the FlowFuse platform.
            Provide exactly one scope: applicationId to list the instances inside one application (unpaginated, no live status unless includeLiveStatus is set), or teamId to list every hosted instance in the team (paginated with page/limit, each result includes its instance type, stack, and template). Passing both, or neither, is rejected.
            Use state to filter by high-level status group ("running", "error", or "notRunning", the same groups as the dashboard's Running/Error/Not Running filter).
            Set includeLiveStatus to true to also fetch each instance's real-time running state (running, stopped, deploying, etc) - this is slower since it queries the underlying containers, so only set it when the user actually needs to know what's happening right now.
            count means different things per scope: team-wide it is the total across all pages, so compare it against the
            length of the instances array and page with page/limit; scoped to an application the listing is unpaginated,
            so count is simply how many instances came back.
            sort and orderByMostRecentFlows are not interchangeable and cannot be combined. sort orders purely by the
            field you name. orderByMostRecentFlows sorts by health first (errored, then running, then stopped, then the
            rest) and only uses recent flow activity to break ties within each bucket, so reach for it when the user
            wants "what needs attention" rather than a plain ordering.
            To read the full settings of one specific instance, call platform_get_hosted_instance with its ID.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId: teamId.optional().describe('List every hosted instance in this team. Provide either this or applicationId, not both.'),
            applicationId: applicationId.optional().describe('List only the hosted instances inside this application. Provide either this or teamId, not both.'),
            query: searchQuery.query.describe('Search hosted instances by name'),
            state: z.array(z.enum(['running', 'error', 'notRunning'])).optional()
                .describe('Filter by high-level status group, matching the dashboard\'s own status filter: "running" (includes starting/warning/deploying-type states), "error" (error/crashed), "notRunning" (stopped/suspended/offline/unknown, i.e. "Not Running" in the dashboard - note this is broader than just the "stopped" state). Team-wide, this filters on the last-known cached state. Scoped to an application, this requires a live status fetch, so it is applied after fetching (implies includeLiveStatus).'),
            includeLiveStatus: z.boolean().optional()
                .describe('If true, also fetch each instance\'s real-time running state. Slower than filtering by state, since it queries every matching instance\'s container.'),
            page: pageParam.page.describe('Page number to fetch (1-based). Ignored when applicationId is set, since that listing is not paginated.'),
            limit: limitParam.limit.describe('How many results to return per page (1-50, default 10). Ignored when applicationId is set.'),
            sort: z.enum(['name', 'createdAt', 'updatedAt', 'application.name', 'flowLastUpdatedAt']).optional().describe('Field to sort the team-wide instance list by (ignored when applicationId is set). The "flowLastUpdatedAt" option additionally requires includeLiveStatus to be set; without it the list falls back to its default order. Cannot be combined with orderByMostRecentFlows.'),
            dir: sortParams.dir,
            orderByMostRecentFlows: z.boolean().optional().describe('Order the team-wide list by health first (errored, then running, then stopped, then the rest), using most recent flow activity to break ties within each group. Use this for a "what needs attention first" ordering. Requires includeLiveStatus, is ignored when applicationId is set, and cannot be combined with sort.')
        },
        handler: async (args, { inject }) => {
            if (args.teamId && args.applicationId) {
                return toolError(400, 'invalid_request', 'Provide either teamId to list a whole team or applicationId to list a single application, not both.')
            }
            if (!args.teamId && !args.applicationId) {
                return toolError(400, 'invalid_request', 'Provide teamId to list a whole team, or applicationId to list a single application.')
            }
            if (args.applicationId) {
                const teamOnly = ['sort', 'dir', 'orderByMostRecentFlows'].filter((key) => args[key] !== undefined)
                if (teamOnly.length > 0) {
                    return toolError(400, 'invalid_request', `${teamOnly.join(', ')} can only be used when listing across a whole team. Drop applicationId to sort the team-wide list, or remove these parameters to list this application.`)
                }
                return listApplicationHostedInstances(args, { inject })
            }
            // Team path only: both of these are team-wide ordering controls.
            if (args.sort !== undefined && args.orderByMostRecentFlows !== undefined) {
                // The route applies orderByMostRecentFlows only when sort produced no ordering, so
                // passing both silently drops the health-first ordering the caller asked for.
                return toolError(400, 'invalid_request', 'sort and orderByMostRecentFlows are different orderings and cannot be combined - sort would win and orderByMostRecentFlows would be ignored. Pick one: sort for a plain field ordering, orderByMostRecentFlows for health-first.')
            }
            if (args.orderByMostRecentFlows && !args.includeLiveStatus) {
                return toolError(400, 'invalid_request', 'orderByMostRecentFlows requires includeLiveStatus, since the ordering is computed from live state. Set includeLiveStatus: true or drop orderByMostRecentFlows.')
            }
            return listTeamHostedInstances(args, { inject })
        }
    },
    {
        name: 'platform_get_hosted_instance',
        title: 'Get Hosted Instance',
        description: `FlowFuse platform automation tool:
            Gets the full details of one specific hosted instance.
            A hosted instance is a Node-RED that runs on the same environment as the FlowFuse platform.
            Use this when you already have a hosted instance ID and need to know everything about it:
            its name, URL, settings, what application and team it belongs to, its current state, and its specification (the instance type, stack, and template it uses).
            Read the specification from this tool whenever you need to know or compare what an existing instance is running, for example to duplicate it.
            If you need to list all hosted instances first, call platform_list_hosted_instances.
            To check the live running status, call platform_get_hosted_instance_status instead.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}` })
            return response
        }
    },
    {
        name: 'platform_get_hosted_instance_status',
        title: 'Get Hosted Instance Status',
        description: `FlowFuse platform automation tool:
            Gets the live running status of a specific hosted instance (running, stopped, suspended, starting, etc.).
            This is different from platform_get_hosted_instance: that tool gives you metadata and settings,
            this tool tells you what the instance is doing right now.
            Use this when the user asks if an instance is running, or when you need to check before performing an action that requires it to be online.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/status` })
            return response
        }
    },
    {
        name: 'platform_get_hosted_instance_logs',
        title: 'Get Hosted Instance Logs',
        description: `FlowFuse platform automation tool:
            Gets the runtime logs for a hosted instance.
            These are the Node-RED console logs showing what happened while the instance was running.
            Use this when the user wants to debug a problem, check what happened after a restart, or look for errors.
            With no cursor you get the most recent entries, but WITHIN the returned page entries are ordered
            oldest first, so log[0] is the earliest line of the page and the last element is the newest.
            Paging goes in two directions and meta carries a cursor for each: meta.next_cursor moves towards NEWER
            entries, and meta.previous_cursor moves towards OLDER ones. To read further back through history - the
            usual case when debugging - follow previous_cursor, not next_cursor. Older cursors are prefixed with "-";
            pass whichever cursor value meta gave you through unchanged rather than building one yourself.
            meta.first_entry and meta.last_entry are the bounds of the whole retained log, so a page whose earliest
            entry equals first_entry means there is nothing older to fetch.
            A suspended instance has no logs to serve and returns a project_suspended error.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            hostedInstanceId,
            limit: z.number().int().min(1).max(100).default(10).optional().describe('Number of log entries to return (1-100, default 10). Higher than other list tools because log lines are small.'),
            cursor: z.string().optional().describe('Pagination cursor, taken verbatim from a previous response\'s meta.next_cursor (newer entries) or meta.previous_cursor (older entries). Omit to get the most recent page.')
        },
        handler: async (args, { inject }) => {
            const params = new URLSearchParams()
            if (args.limit) {
                params.set('limit', String(args.limit))
            }
            if (args.cursor) {
                params.set('cursor', args.cursor)
            }
            const qs = params.toString()
            const url = `/api/v1/projects/${args.hostedInstanceId}/logs${qs ? `?${qs}` : ''}`
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_check_hosted_instance_name_availability',
        title: 'Check Hosted Instance Name Availability',
        description: `FlowFuse platform automation tool:
            Checks if a name is available for a new hosted instance.
            Hosted instance names must be unique across the entire platform.
            Use this before calling platform_create_hosted_instance to make sure the name the user picked is not already taken.
            A name already in use is a normal answer, not a failure: it comes back as { available: false } with a reason,
            so treat only a genuine error envelope as something going wrong.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]*$/).describe('The hosted instance name to check')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'POST', url: '/api/v1/projects/check-name', payload: { name: args.name } })
            // A taken name is the answer this tool exists to give, so report it as
            // available: false rather than passing the route's 409 back as an error.
            if (response.statusCode === 409) {
                return {
                    statusCode: 200,
                    json: () => ({ available: false, reason: response.json()?.error || 'name in use' })
                }
            }
            if (response.statusCode >= 400) {
                return response
            }
            return {
                statusCode: 200,
                json: () => ({ ...response.json(), available: true })
            }
        }
    },
    {
        name: 'platform_create_hosted_instance',
        title: 'Create Hosted Instance',
        description: `FlowFuse platform automation tool:
            Creates a new hosted Node-RED instance inside an application. The instance starts automatically after creation.
            Before calling this tool, gather the required parameters:
            1. Call platform_list_hosted_instance_types first to see what instance types (and their stacks) this team can create, then ask the user which one they want.
            2. If they want a specific Node-RED version or stack, or just the latest. Use platform_list_hosted_instance_types with the chosen projectType to see its stacks. If the user has no preference, use the instance type's defaultStack, which is the latest recommended version.
            3. If they want to start from a blueprint (pre-built starter flows). Call platform_list_blueprints to show them what is available. This is optional.
            4. Call platform_list_templates to get the template. If only one template exists, use it automatically. If there are multiple, ask the user which one to use.
            5. Call platform_check_hosted_instance_name_availability to make sure the chosen name is not already taken. This step is required, not optional - skipping it is the most common cause of a failed creation. If the name is taken, do not silently pick a new one yourself - propose a few alternative options (e.g. with a suffix) and let the user choose, then check that chosen name's availability too.
            When generating a name, always use hyphens to separate multiple words (e.g. "my-new-instance" not "my new instance").
            After the instance is created, wait a few seconds to give it time to boot up, then ask the user if they want to be taken to it. If they do, use the ui_navigate tool with the route name "instance-overview" and params { id: <the new instance id> }.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]*$/).describe('Name for the new hosted instance. When generating a name, always use hyphens to separate multiple words (e.g. "my-new-instance" not "my new instance").'),
            applicationId,
            projectType: z.string().describe('The ID of the hosted instance type (use platform_list_hosted_instance_types to find valid values)'),
            stack: z.string().describe('The ID of the stack (use platform_list_hosted_instance_types to find valid values)'),
            template: z.string().describe('The ID of the template (use platform_list_templates to find valid values)'),
            flowBlueprintId: z.string().optional().describe('Optional blueprint ID to initialize the hosted instance with starter flows (use platform_list_blueprints to find valid values)')
        },
        handler: async (args, { inject }) => {
            const payload = {
                name: args.name,
                applicationId: args.applicationId,
                projectType: args.projectType,
                stack: args.stack,
                template: args.template
            }
            if (args.flowBlueprintId) {
                payload.flowBlueprintId = args.flowBlueprintId
            }
            const response = await inject({ method: 'POST', url: '/api/v1/projects', payload })
            if (response.statusCode >= 400) {
                return response
            }
            // GET /projects/:id blanks hidden template env values before replying; the create
            // route does not, so without this the same secrets that platform_get_hosted_instance
            // and platform_get_template redact come back here in plaintext.
            const project = response.json()
            if (Array.isArray(project.template?.settings?.env)) {
                project.template.settings.env = project.template.settings.env.map(
                    (env) => (env?.hidden ? { ...env, value: '' } : env)
                )
            }
            return { statusCode: response.statusCode, json: () => project }
        }
    },
    {
        name: 'platform_get_hosted_instance_config',
        title: 'Get Hosted Instance Configuration',
        description: `FlowFuse platform automation tool:
            Returns configuration sections for a hosted instance, as a keyed object with one entry per requested section.
            The available sections are:
            "ha" - the High Availability configuration, which runs an instance across multiple replicas so it stays up if one replica fails (plan-gated: a team without it enabled gets a 404 for this section).
            "protection" - the protected-instance configuration, which requires extra confirmation before destructive actions such as suspension or deletion (plan-gated: a team without it enabled gets a 404 for this section).
            "autoUpdateStack" - the auto-update stack (weekly restart) schedule, controlling the windows in which the platform may automatically restart the instance to apply a stack update (no plan gate: a 404 means the instance does not exist).
            Omit sections to return all three. Each section is reported independently as { statusCode, data }, where data holds that section's payload (an object for "ha" and "protection", an array of weekly restart windows for "autoUpdateStack"). One section being unavailable does not affect the others, and the call itself succeeds even when every section is unavailable - read each section's own statusCode rather than treating the whole call as failed.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            hostedInstanceId,
            sections: z.array(z.enum(['ha', 'protection', 'autoUpdateStack'])).optional().describe('Which configuration sections to return. Omit to return all sections.')
        },
        handler: async (args, { inject }) => {
            const sectionRoutes = {
                ha: 'ha',
                protection: 'protectInstance',
                autoUpdateStack: 'autoUpdateStack'
            }
            const requested = args.sections?.length ? args.sections : ['ha', 'protection', 'autoUpdateStack']
            const responses = await Promise.all(
                requested.map((section) => inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/${sectionRoutes[section]}` }))
            )
            const result = {}
            requested.forEach((section, index) => {
                const response = responses[index]
                result[section] = { statusCode: response.statusCode, data: response.json() }
            })
            // Always a successful call, for the same reason as above: every section reports its
            // own statusCode, so an error status on the envelope would only stringify the whole
            // per-section report away - which is what happened when all requested sections 404'd.
            return { statusCode: 200, json: () => result }
        }
    },
    {
        name: 'platform_get_hosted_instance_custom_hostname',
        title: 'Get Hosted Instance Custom Hostname',
        description: `FlowFuse platform automation tool:
            Returns the custom hostname configured for a hosted instance.
            Custom hostnames are a plan-gated feature: a team without it enabled gets a 404 error.
            Set includeStatus to also fetch the live verification status of the hostname, i.e. whether the DNS
            CNAME record has been set up correctly and points at the platform.
            When includeStatus is set, the two parts are reported independently as { statusCode, data }, the same way
            platform_get_hosted_instance_config reports its sections - one part failing does not hide the other.
            For that status, a 200 means the hostname is verified, a 410 means a hostname is set but its CNAME
            record does not resolve to the platform yet, and a 404 can mean no custom hostname is configured,
            the platform does not support hostname verification, or the feature is not enabled for the team.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            hostedInstanceId,
            includeStatus: z.boolean().optional().describe('If true, also fetch the live verification status of the custom hostname')
        },
        handler: async (args, { inject }) => {
            const hostnameResponse = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/customHostname` })
            if (!args.includeStatus) {
                return hostnameResponse
            }
            const statusResponse = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/customHostname/status` })
            // Report each part with its own status, as get_hosted_instance_config does. Keeping the
            // first response's error status here would send this composed body down formatResponse's
            // error branch, where it gets stringified into a single unreadable `error` field.
            const result = {
                hostname: { statusCode: hostnameResponse.statusCode, data: hostnameResponse.json() },
                status: { statusCode: statusResponse.statusCode, data: statusResponse.json() }
            }
            // Always a successful call: gathering the report worked, and each part carries its
            // own statusCode to say how that part went. Returning an error status here instead
            // sends this composed body down formatResponse's error branch, which stringifies the
            // whole thing into one unreadable `error` field - including the ordinary "no custom
            // hostname configured" case, where both parts are a 404.
            return { statusCode: 200, json: () => result }
        }
    },
    {
        name: 'platform_list_hosted_instance_files',
        title: 'List Hosted Instance Files',
        description: `FlowFuse platform automation tool:
            Lists the files and directories inside a hosted instance's file store at the given path.
            Pass an empty string for the path to list the root of the file store.
            The result has a "files" array, where each entry has a "name" (relative to the path just listed, not a full path) and a "type" of either "file" or "directory".
            To descend into a directory, call again with path set to that directory's name, or joined onto the current path with a "/" separator when you are already in a subdirectory (for example "logs" then "logs/archive").
            Static file storage is a plan-gated feature: a team without it enabled gets a 404 error.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            hostedInstanceId,
            path: z.string().describe('Directory path within the instance file store to list, relative to the file-store root (empty string for the root itself). Build deeper paths by joining directory names with "/".')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/files/_/${encodeURIComponent(args.path)}` })
            return response
        }
    },
    {
        name: 'platform_get_hosted_instance_resources',
        title: 'Get Hosted Instance Resources',
        description: `FlowFuse platform automation tool:
            Reads recent resource usage (CPU, memory) for a hosted instance as a time-series: a list of samples over time, each with a timestamp, rather than a single current reading.
            Each sample uses short keys: ts is the sample time (epoch milliseconds), ps is resident memory in megabytes,
            cpu is CPU use as a percentage of one core, and src is a short hash of the reporting replica's hostname,
            which is what separates the replicas of an HA instance. cpu is absent on the first sample after a start,
            because it is derived from the delta against the previous sample.
            This is plan-gated on the instanceResources feature, which defaults to disabled; if the team's plan has this feature disabled, the call returns a not-found error.
            This returns the stored usage history, not a live streaming feed.
            The whole retained history comes back in one response and cannot be paged or narrowed, so it can be long for a
            busy instance. Read the samples you need from the result rather than calling this repeatedly.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            hostedInstanceId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/projects/${args.hostedInstanceId}/resources` })
            return response
        }
    },
    {
        name: 'platform_list_team_dashboard_instances',
        title: 'List Team Dashboard Instances',
        description: `FlowFuse platform automation tool:
            Lists the hosted instances in a team that have the Node-RED dashboard module installed.
            Use this to find instances that expose a dashboard rather than checking every instance individually.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/dashboard-instances` })
            return response
        }
    },
    {
        name: 'platform_update_hosted_instance_env',
        title: 'Update Hosted Instance Environment Variables',
        description: `FlowFuse platform automation tool:
            Replaces the full set of environment variables on a hosted instance. Variables missing from the list are removed, so read the current set first (platform_get_hosted_instance_config) and resend everything that should stay.
            To keep an existing hidden (secret) variable's stored value without knowing it, resend it with hidden true and an empty value. A hidden entry with an empty value that does not already exist on the instance is dropped.
            Settings the instance's template locks are silently dropped rather than rejected, so a locked value can come back unchanged with no error. "settings_validation" is raised for malformed input instead, such as a bad or duplicated env var name.
            The new values take effect when the instance's flows next restart (use platform_instance_action with restart to apply them immediately).
            This is the only instance-level write a team Member can make; the wider platform_update_hosted_instance_settings tool needs Owner permissions.`,
        // destructiveHint: env is a full replacement, so anything omitted is deleted.
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            instanceId: hostedInstanceId.describe('The id (UUID) of the hosted instance whose environment variables to replace'),
            env: z.array(z.object({
                name: z.string().describe('Environment variable name'),
                value: z.string().describe('Environment variable value. For an existing hidden variable, pass an empty string (with hidden true) to keep the stored value'),
                hidden: z.boolean().optional().describe('Whether the value is masked in the UI')
            })).describe('Full replacement list of the instance environment variables')
        },
        handler: async (args, { inject }) => {
            // A body of exactly { settings: { env } } is what selects the narrower
            // project:edit-env permission path on the route - do not add fields here.
            const response = await inject({ method: 'PUT', url: `/api/v1/projects/${args.instanceId}`, payload: { settings: { env: args.env } } })
            return response
        }
    },
    {
        name: 'platform_update_hosted_instance_settings',
        title: 'Update Hosted Instance Settings',
        description: `FlowFuse platform automation tool:
            Updates a hosted instance: rename it, change its settings or launcher settings, switch its instance type or stack, or copy configuration and flows from another instance. Only the fields you pass are changed.
            CAUTION: changing name, projectType, or stack replies as soon as the change is accepted and then RESTARTS the instance in the background - confirm with the user first, and check platform_get_hosted_instance_status to see it come back. Changing projectType additionally requires passing a matching stack. Names must be unique across the platform (409 "invalid_project_name" otherwise).
            settings are merged field-by-field into the existing settings. Values the template locks are silently dropped rather than rejected; "settings_validation" is raised for malformed input instead. To change ONLY environment variables prefer platform_update_hosted_instance_env, which works with Member permissions.
            sourceProject copies flows/configuration from another instance in the same team onto this one, overwriting its current content - treat it as destructive and confirm with the user. The response returns while the copy runs in the background.`,
        // destructiveHint: sourceProject overwrites the target instance flows, and name/stack/type changes restart it.
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            instanceId: hostedInstanceId.describe('The id (UUID) of the hosted instance to update'),
            name: z.string().optional().describe('New name for the instance. Must be unique across the platform; changing it restarts the instance'),
            settings: z.record(z.string(), z.any()).optional().describe('Instance settings to merge in (palette, editor, security, and so on), validated against the template. For env-only changes use platform_update_hosted_instance_env instead'),
            launcherSettings: z.object({
                healthCheckInterval: z.number().optional().describe('Launcher health-check interval in milliseconds, minimum 5000'),
                disableAutoSafeMode: z.boolean().optional().describe('Whether to disable automatic safe mode after repeated crashes')
            }).optional().describe('Node-RED launcher settings'),
            projectType: z.string().optional().describe('The hashid of the instance type to switch to. Requires stack to be passed as well; restarts the instance'),
            stack: z.string().optional().describe('The hashid of the stack to switch to (see platform_list_hosted_instance_types). Restarts the instance'),
            sourceProject: z.object({
                id: z.string().uuid().describe('UUID of the source instance to copy from. Must be in the same team'),
                options: z.record(z.string(), z.any()).optional().describe('Flags selecting which parts to copy (flows, credentials, envVars, and so on)')
            }).optional().describe('Copies configuration and flows from another instance onto this one, overwriting current content. Confirm with the user first')
        },
        handler: async (args, { inject }) => {
            const payload = {}
            for (const key of ['name', 'settings', 'launcherSettings', 'projectType', 'stack', 'sourceProject']) {
                if (args[key] !== undefined) {
                    payload[key] = args[key]
                }
            }
            const response = await inject({ method: 'PUT', url: `/api/v1/projects/${args.instanceId}`, payload })
            return response
        }
    },
    {
        name: 'platform_import_hosted_instance_flows',
        title: 'Import Hosted Instance Flows',
        description: `FlowFuse platform automation tool:
            Imports flows (and optionally their credentials) into a hosted instance, REPLACING the flows it currently has. If the instance is running, the new flows are deployed immediately. Confirm with the user before importing.
            flows is the Node-RED flows array serialized as a JSON string. credentials must be the encrypted credentials object (as exported from another instance) serialized as a JSON string, with credsSecret set to the secret that encrypted them - a wrong secret fails with 403 "invalid_credentials_secret".
            To build whole flows interactively prefer the flow-building editor tools; this tool is for transplanting existing flow JSON.`,
        // destructiveHint: this replaces the instance flows and deploys them.
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            instanceId: hostedInstanceId.describe('The id (UUID) of the hosted instance to import flows into'),
            flows: z.string().optional().describe('Node-RED flows array serialized as a JSON string. Replaces the instance flows'),
            credentials: z.string().optional().describe('Encrypted flow credentials object serialized as a JSON string, as exported from another instance'),
            credsSecret: z.string().optional().describe('Secret used to decrypt the supplied credentials. Required when credentials are supplied')
        },
        handler: async (args, { inject }) => {
            const payload = {}
            for (const key of ['flows', 'credentials', 'credsSecret']) {
                if (args[key] !== undefined) {
                    payload[key] = args[key]
                }
            }
            const response = await inject({ method: 'POST', url: `/api/v1/projects/${args.instanceId}/import`, payload })
            return response
        }
    },
    {
        name: 'platform_set_instance_config',
        title: 'Set Hosted Instance Configuration',
        description: `FlowFuse platform automation tool:
            Enables, disables, sets, or clears one configuration surface on a hosted instance. surface picks the config, action picks the transition:
            ha uses enable/disable. Enabling requires replicas (only 2 is accepted; anything else is a 409). CAUTION: enabling or disabling HA restarts the instance in the background.
            customHostname uses set/clear. Setting requires hostname; an unavailable hostname is a 409 "hostname_not_available". CAUTION: setting or clearing the hostname restarts the instance in the background.
            protection uses enable/disable. A protected instance only accepts deploys and pipeline pushes from team Owners. No restart involved.
            autoUpdateStack uses set/clear. Setting requires schedule and REPLACES the whole weekly schedule of allowed automatic stack-update windows. No restart involved.
            ha, customHostname and protection are plan-gated features: a team whose plan does not include them gets a 404, indistinguishable from a missing instance. autoUpdateStack has no plan gate.`,
        // destructiveHint: the disable and clear actions remove existing configuration.
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            instanceId: hostedInstanceId.describe('The id (UUID) of the hosted instance'),
            surface: z.enum(['ha', 'customHostname', 'protection', 'autoUpdateStack']).describe('Configuration surface to change'),
            action: z.enum(['enable', 'disable', 'set', 'clear']).describe('Transition to apply: ha/protection use enable/disable, customHostname/autoUpdateStack use set/clear'),
            replicas: z.literal(2).optional().describe('HA replica count, required when enabling ha. Only 2 is accepted'),
            hostname: z.string().optional().describe('Custom hostname, required when setting customHostname. A DNS CNAME for it must point at the platform'),
            schedule: z.array(z.object({
                day: z.number().min(0).max(6).describe('Day-of-week index the entry applies to (0 = Sunday)'),
                hour: z.number().min(0).max(23).describe('Hour of the day for the allowed update window'),
                restart: z.boolean().describe('Whether an automatic stack update may restart the instance in this window')
            })).optional().describe('Weekly schedule of allowed automatic stack-update windows, required when setting autoUpdateStack. Replaces the entire stored schedule')
        },
        handler: async (args, { inject }) => {
            const surfaces = {
                ha: { path: 'ha', actions: ['enable', 'disable'] },
                customHostname: { path: 'customHostname', actions: ['set', 'clear'] },
                protection: { path: 'protectInstance', actions: ['enable', 'disable'] },
                autoUpdateStack: { path: 'autoUpdateStack', actions: ['set', 'clear'] }
            }
            const surface = surfaces[args.surface]
            if (!surface.actions.includes(args.action)) {
                return toolError(400, 'invalid_request', `Surface ${args.surface} uses the actions ${surface.actions.join('/')}, not ${args.action}`)
            }
            const url = `/api/v1/projects/${args.instanceId}/${surface.path}`
            if (args.action === 'disable' || args.action === 'clear') {
                const response = await inject({ method: 'DELETE', url })
                return response
            }
            let payload
            if (args.surface === 'ha') {
                if (args.replicas === undefined) {
                    return toolError(400, 'invalid_request', 'replicas is required when enabling ha (only 2 is accepted)')
                }
                payload = { replicas: args.replicas }
            } else if (args.surface === 'customHostname') {
                if (!args.hostname) {
                    return toolError(400, 'invalid_request', 'hostname is required when setting customHostname')
                }
                payload = { hostname: args.hostname }
            } else if (args.surface === 'autoUpdateStack') {
                if (!args.schedule) {
                    return toolError(400, 'invalid_request', 'schedule is required when setting autoUpdateStack')
                }
                payload = { schedule: args.schedule }
            } else {
                payload = { enabled: true }
            }
            const response = await inject({ method: 'PUT', url, payload })
            return response
        }
    },
    {
        name: 'platform_update_instance_file',
        title: 'Update Hosted Instance File',
        description: `FlowFuse platform automation tool:
            Updates the properties of an existing file or directory in a hosted instance's file store: either rename/move it with newPath, or set a directory's static sharing config with share. Exactly one of the two per call - it does not upload content (use platform_upload_instance_file for that).
            share applies to directories only: { root: "/some/path" } serves the directory's contents publicly at that URL path on the instance, {} stops sharing it. Sharing a path that is a file (not a directory) fails with a 404.
            Static file storage is a plan-gated feature: a team without it enabled gets a 404 error.`,
        // destructiveHint: renaming or moving removes the file from its old path.
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            instanceId: hostedInstanceId.describe('The id (UUID) of the hosted instance'),
            path: z.string().describe('Path of the existing file or directory, relative to the file-store root, with "/" separators (as listed by platform_list_hosted_instance_files)'),
            newPath: z.string().optional().describe('New path for a rename or move, relative to the file-store root. Provide exactly one of newPath or share'),
            share: z.record(z.string(), z.any()).optional().describe('Directory sharing config: { root: "/url/path" } to serve the directory publicly at that path on the instance, {} to stop sharing. Provide exactly one of newPath or share')
        },
        handler: async (args, { inject }) => {
            const hasNewPath = args.newPath !== undefined
            const hasShare = args.share !== undefined
            if (hasNewPath === hasShare) {
                return toolError(400, 'invalid_request', 'Provide exactly one of newPath (rename/move) or share (directory sharing)')
            }
            const payload = hasNewPath ? { path: args.newPath } : { share: args.share }
            const response = await inject({ method: 'PUT', url: `/api/v1/projects/${args.instanceId}/files/_/${encodeURIComponent(args.path)}`, payload })
            return response
        }
    },
    {
        name: 'platform_upload_instance_file',
        title: 'Upload Hosted Instance File',
        description: `FlowFuse platform automation tool:
            Writes to a hosted instance's file store: either uploads text content as a file, or creates a directory. Exactly one of content or directoryName per call.
            With content, path is the FULL destination path of the file (including its name) and the content is stored there, replacing any existing file. Only text content is supported through this tool.
            With directoryName, path is the EXISTING parent directory ("" for the root) and a directory of that name is created inside it.
            Static file storage is a plan-gated feature: a team without it enabled gets a 404 error.`,
        // destructiveHint: uploading replaces any file already at that path.
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            instanceId: hostedInstanceId.describe('The id (UUID) of the hosted instance'),
            path: z.string().describe('With content: the full destination file path including the file name. With directoryName: the existing parent directory path (empty string for the root). Use "/" separators'),
            content: z.string().optional().describe('Text content to store as the file at path, replacing any existing file. Provide exactly one of content or directoryName'),
            directoryName: z.string().optional().describe('Name of the directory to create inside path. Provide exactly one of content or directoryName')
        },
        handler: async (args, { inject }) => {
            const hasContent = args.content !== undefined
            const hasDirectory = args.directoryName !== undefined
            if (hasContent === hasDirectory) {
                return toolError(400, 'invalid_request', 'Provide exactly one of content (file upload) or directoryName (create a directory)')
            }
            const url = `/api/v1/projects/${args.instanceId}/files/_/${encodeURIComponent(args.path)}`
            if (hasDirectory) {
                const response = await inject({ method: 'POST', url, payload: { path: args.directoryName } })
                return response
            }
            // The route only accepts file content as multipart/form-data, so build a
            // single-part body by hand; the target name comes from the URL path, not
            // the part's filename.
            // A fixed boundary would corrupt any upload whose text happened to contain
            // it, and arbitrary text is the supported case, so generate one per call.
            const boundary = `FlowFuseMcpFileUpload${randomUUID().replace(/-/g, '')}`
            const filename = args.path.split('/').pop()
            const payload = [
                `--${boundary}`,
                `Content-Disposition: form-data; name="file"; filename="${filename}"`,
                'Content-Type: application/octet-stream',
                '',
                args.content,
                `--${boundary}--`,
                ''
            ].join('\r\n')
            const response = await inject({
                method: 'POST',
                url,
                headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
                payload
            })
            return response
        }
    }
]

async function listApplicationHostedInstances (args, { inject }) {
    const needsLiveStatus = args.includeLiveStatus || args.state?.length > 0
    const calls = [inject({ method: 'GET', url: `/api/v1/applications/${args.applicationId}/instances` })]
    if (needsLiveStatus) {
        calls.push(inject({ method: 'GET', url: `/api/v1/applications/${args.applicationId}/instances/status` }))
    }
    const [listResponse, statusResponse] = await Promise.all(calls)
    if (listResponse.statusCode >= 400) {
        return listResponse
    }
    if (statusResponse && statusResponse.statusCode >= 400) {
        return statusResponse
    }

    const stateByInstance = statusResponse
        ? new Map(statusResponse.json().instances.map((instance) => [instance.id, instance.meta?.state]))
        : new Map()

    let instances = listResponse.json().instances || []
    if (args.query) {
        const search = args.query.toLowerCase()
        instances = instances.filter((instance) => instance.name.toLowerCase().includes(search))
    }
    if (args.state?.length) {
        const wantedStates = new Set(expandStateGroups(args.state))
        instances = instances.filter((instance) => wantedStates.has(stateByInstance.get(instance.id)))
    }
    instances = instances.map((instance) => ({
        id: instance.id,
        name: instance.name,
        url: instance.url,
        state: stateByInstance.get(instance.id)
    }))

    return {
        statusCode: listResponse.statusCode,
        json: () => ({ count: instances.length, instances })
    }
}

async function listTeamHostedInstances (args, { inject }) {
    const params = new URLSearchParams({
        page: String(args.page || 1),
        limit: String(args.limit || 10)
    })
    if (args.query) {
        params.set('query', args.query)
    }
    if (args.state?.length) {
        expandStateGroups(args.state).forEach((state) => params.append('state', state))
    }
    if (args.includeLiveStatus) {
        params.set('includeMeta', 'true')
    }
    if (args.sort) {
        params.set('sort', args.sort)
    }
    if (args.dir) {
        params.set('dir', args.dir)
    }
    if (args.orderByMostRecentFlows) {
        params.set('orderByMostRecentFlows', 'true')
    }

    const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/projects?${params}` })
    if (response.statusCode >= 400) {
        return response
    }

    const body = response.json()
    const instances = (body.projects || []).map((project) => ({
        id: project.id,
        name: project.name,
        url: project.url,
        application: project.application ? { id: project.application.id, name: project.application.name } : undefined,
        projectType: project.projectType ? { id: project.projectType.id, name: project.projectType.name } : undefined,
        stack: project.stack ? { id: project.stack.id, name: project.stack.name, label: project.stack.label } : undefined,
        template: project.template ? { id: project.template.id, name: project.template.name } : undefined,
        state: project.meta?.state
    }))

    return {
        statusCode: response.statusCode,
        json: () => ({
            count: body.meta?.total ?? body.count,
            meta: body.meta
                ? { page: body.meta.page, pageSize: body.meta.pageSize, total: body.meta.total, pageCount: body.meta.pageCount }
                : undefined,
            instances
        })
    }
}
