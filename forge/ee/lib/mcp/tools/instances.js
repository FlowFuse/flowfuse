const { z } = require('zod')

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
            Pass applicationId to list only the instances inside one application (unpaginated, no live status unless includeLiveStatus is set).
            Omit applicationId to list every hosted instance in the team (paginated with page/limit, each result includes its instance type, stack, and template).
            Use state to filter by high-level status group ("running", "error", or "notRunning", the same groups as the dashboard's Running/Error/Not Running filter).
            Set includeLiveStatus to true to also fetch each instance's real-time running state (running, stopped, deploying, etc) - this is slower since it queries the underlying containers, so only set it when the user actually needs to know what's happening right now.
            To read the full settings of one specific instance, call platform_get_hosted_instance with its ID.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().describe('The ID or hashid of the team'),
            applicationId: z.string().optional().describe('Restrict results to hosted instances inside this application. Omit to list every hosted instance in the team.'),
            query: z.string().optional().describe('Search hosted instances by name'),
            state: z.array(z.enum(['running', 'error', 'notRunning'])).optional()
                .describe('Filter by high-level status group, matching the dashboard\'s own status filter: "running" (includes starting/warning/deploying-type states), "error" (error/crashed), "notRunning" (stopped/suspended/offline/unknown, i.e. "Not Running" in the dashboard - note this is broader than just the "stopped" state). Team-wide, this filters on the last-known cached state. Scoped to an application, this requires a live status fetch, so it is applied after fetching (implies includeLiveStatus).'),
            includeLiveStatus: z.boolean().optional()
                .describe('If true, also fetch each instance\'s real-time running state. Slower than filtering by state, since it queries every matching instance\'s container.'),
            page: z.number().min(1).optional().describe('Page number to fetch (1-based). Ignored when applicationId is set, since that listing is not paginated.'),
            limit: z.number().min(1).max(10).default(10).describe('How many results to return per page. Ignored when applicationId is set.')
        },
        handler: async (args, { inject }) => {
            if (args.applicationId) {
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
            hostedInstanceId: z.string().describe('The ID or hashid of the hosted instance')
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
            hostedInstanceId: z.string().describe('The ID or hashid of the hosted instance')
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
            hostedInstanceId: z.string().describe('The ID or hashid of the hosted instance'),
            limit: z.number().min(1).max(100).describe('Number of log entries to return'),
            cursor: z.string().optional().describe('Cursor for pagination (the ID of the last entry from the previous page)')
        },
        handler: async (args, { inject }) => {
            let url = `/api/v1/projects/${args.hostedInstanceId}/logs`
            const params = []
            if (args.limit) {
                params.push(`limit=${args.limit}`)
            }
            if (args.cursor) {
                params.push(`cursor=${args.cursor}`)
            }
            if (params.length > 0) {
                url += '?' + params.join('&')
            }
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
            Use this before calling platform_create_hosted_instance to make sure the name the user picked is not already taken.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]*$/).describe('The hosted instance name to check')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'POST', url: '/api/v1/projects/check-name', payload: { name: args.name } })
            return response
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
            applicationId: z.string().describe('The ID or hashid of the application'),
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
    const params = [`page=${args.page || 1}`, `limit=${args.limit || 10}`]
    if (args.query) {
        params.push(`query=${encodeURIComponent(args.query)}`)
    }
    if (args.state?.length) {
        expandStateGroups(args.state).forEach((state) => params.push(`state=${state}`))
    }
    if (args.includeLiveStatus) {
        params.push('includeMeta=true')
    }

    const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/projects?${params.join('&')}` })
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
