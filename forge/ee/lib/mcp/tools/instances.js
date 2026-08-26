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
            To read the full settings of one specific instance, call platform_get_hosted_instance with its ID.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
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
            sort: z.enum(['name', 'createdAt', 'updatedAt', 'application.name', 'flowLastUpdatedAt']).optional().describe('Field to sort the team-wide instance list by (ignored when applicationId is set). The "flowLastUpdatedAt" option additionally requires includeLiveStatus to be set; without it the list falls back to its default order.'),
            dir: sortParams.dir,
            orderByMostRecentFlows: z.boolean().optional().describe('Order the team-wide list by most recently updated flows (ignored when applicationId is set, and only applied when includeLiveStatus is also set)')
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
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId: z.string().describe('The id (UUID) of the hosted instance')
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
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId: z.string().describe('The id (UUID) of the hosted instance')
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
            Results come back newest first. Use cursor to page through older entries.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            hostedInstanceId: z.string().describe('The id (UUID) of the hosted instance'),
            limit: z.number().int().min(1).max(100).default(10).optional().describe('Number of log entries to return (1-100, default 10). Higher than other list tools because log lines are small.'),
            cursor: z.string().optional().describe('Cursor for pagination (the ID of the last entry from the previous page)')
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
        annotations: { readOnlyHint: true, destructiveHint: false },
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
        annotations: { readOnlyHint: false, destructiveHint: false },
        inputSchema: {
            name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]*$/).describe('Name for the new hosted instance. When generating a name, always use hyphens to separate multiple words (e.g. "my-new-instance" not "my new instance").'),
            applicationId: z.string().describe('The hashid of the application'),
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
        annotations: { readOnlyHint: true, destructiveHint: false },
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
        annotations: { readOnlyHint: true, destructiveHint: false },
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
        annotations: { readOnlyHint: true, destructiveHint: false },
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
        name: 'platform_list_team_dashboard_instances',
        title: 'List Team Dashboard Instances',
        description: `FlowFuse platform automation tool:
            Lists the hosted instances in a team that have the Node-RED dashboard module installed.
            Use this to find instances that expose a dashboard rather than checking every instance individually.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/dashboard-instances` })
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
