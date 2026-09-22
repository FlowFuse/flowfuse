const { z } = require('zod')

const { teamId, applicationId, toolError, gitStageFields, gitStageFieldKeys } = require('../schemas')

const stageAction = z.enum(['create_snapshot', 'use_active_snapshot', 'use_latest_snapshot', 'prompt', 'none']).optional()
    .describe('How the stage obtains the snapshot it passes on when deployed FROM: create_snapshot makes a new one (the default), use_active_snapshot and use_latest_snapshot reuse existing ones, prompt requires a sourceSnapshotId at deploy time, none makes deploys from this stage a no-op. Not meaningful for git-repo stages')
const deployToDevices = z.boolean().optional()
    .describe('For a hosted-instance stage: also push to the devices assigned to that instance when this stage is deployed to')
const stagePayloadKeys = ['name', 'instanceId', 'deviceId', 'deviceGroupId', ...gitStageFieldKeys, 'deployToDevices', 'action']

module.exports = [
    {
        name: 'platform_list_pipelines',
        title: 'List Pipelines',
        description: `FlowFuse platform automation tool:
            Lists the DevOps pipelines for either a team or a single application.
            Provide a teamId to list every pipeline in the team, or an applicationId to list
            only the pipelines belonging to that application. Provide exactly one of the two.
            Team results include only the applications you have access to.
            Use this to discover which pipelines exist before inspecting a specific pipeline's stages.
            Every pipeline comes back with all of its stages inlined, and the listing cannot be paged or narrowed, so a
            team with many pipelines returns a long response. Scope to an applicationId when you can.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId: teamId.optional().describe('List the pipelines in this team. Provide exactly one of teamId or applicationId.'),
            applicationId: applicationId.optional().describe('List the pipelines in this application. Provide exactly one of teamId or applicationId.')
        },
        handler: async (args, { inject }) => {
            if (Boolean(args.teamId) === Boolean(args.applicationId)) {
                return toolError(400, 'invalid_request', 'Provide exactly one of teamId or applicationId.')
            }
            if (args.applicationId) {
                const response = await inject({ method: 'GET', url: `/api/v1/applications/${args.applicationId}/pipelines` })
                return response
            }
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/pipelines` })
            return response
        }
    },
    {
        name: 'platform_get_pipeline_stage',
        title: 'Get Pipeline Stage',
        description: `FlowFuse platform automation tool:
            Fetches the full details of a single stage within a pipeline, including what it
            targets (hosted instance, remote instance/device, device group, or git repository)
            and its snapshot action.
            Use this once you have a pipeline ID and a stage ID and need to inspect that stage.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            pipelineId: z.string().describe('Pipeline hashid the stage belongs to'),
            stageId: z.string().describe('Pipeline stage hashid to fetch')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/pipelines/${args.pipelineId}/stages/${args.stageId}` })
            return response
        }
    },
    {
        name: 'platform_create_pipeline',
        title: 'Create Pipeline',
        description: `FlowFuse platform automation tool:
            Creates a new, empty DevOps pipeline in an application. Add stages with platform_add_pipeline_stage afterwards.
            A pipeline is an ordered chain of stages (hosted instances, remote instances/devices, device groups, or git repositories) that flows are promoted through with platform_deploy_pipeline_stage.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            applicationId: applicationId.describe('The hashid of the application to create the pipeline in'),
            name: z.string().min(1).describe('Name for the new pipeline')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'POST', url: '/api/v1/pipelines', payload: { applicationId: args.applicationId, name: args.name } })
            return response
        }
    },
    {
        name: 'platform_update_pipeline',
        title: 'Update Pipeline',
        description: `FlowFuse platform automation tool:
            Renames a pipeline. The name is the only property a pipeline has beyond its stages; use the stage tools to change stages.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            pipelineId: z.string().describe('The hashid of the pipeline to rename'),
            name: z.string().min(1).describe('New name for the pipeline')
        },
        handler: async (args, { inject }) => {
            // The route's handler reads request.body.pipeline.name (not the flat name its
            // declared schema suggests), so wrap the flat input into the working shape.
            const response = await inject({ method: 'PUT', url: `/api/v1/pipelines/${args.pipelineId}`, payload: { pipeline: { name: args.name } } })
            return response
        }
    },
    {
        name: 'platform_add_pipeline_stage',
        title: 'Add Pipeline Stage',
        description: `FlowFuse platform automation tool:
            Adds a stage to a pipeline. Stages form an ordered chain that flows are promoted through with platform_deploy_pipeline_stage, and each one points at a single deploy target that must belong to the pipeline's application (git tokens to its team).
            Ordering rules enforced by the API: a device group cannot be the first stage, and an instance or device cannot be added after a device group.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            pipelineId: z.string().describe('The hashid of the pipeline to add the stage to'),
            name: z.string().min(1).describe('Name for the stage'),
            instanceId: z.string().uuid().optional().describe('UUID of the hosted instance this stage deploys to. Pass exactly one target'),
            deviceId: z.string().optional().describe('Hashid of the remote instance (device) this stage deploys to. Pass exactly one target'),
            deviceGroupId: z.string().optional().describe('Hashid of the device group this stage deploys to. Cannot be the first stage. Pass exactly one target'),
            ...gitStageFields(),
            deployToDevices,
            action: stageAction,
            source: z.string().optional().describe('Stage ordering is a linked list: this is the hashid of the existing stage the new stage comes after. Required for every stage except a pipeline\'s very first. Omitting it on a pipeline that already has stages does not append the stage, it becomes a second unlinked head and the pipeline then lists only the new stage while the existing ones stop appearing, even though they still exist and can still be fetched by id')
        },
        handler: async (args, { inject }) => {
            const payload = {}
            for (const key of [...stagePayloadKeys, 'source']) {
                if (args[key] !== undefined) {
                    payload[key] = args[key]
                }
            }
            const response = await inject({ method: 'POST', url: `/api/v1/pipelines/${args.pipelineId}/stages`, payload })
            return response
        }
    },
    {
        name: 'platform_update_pipeline_stage',
        title: 'Update Pipeline Stage',
        description: `FlowFuse platform automation tool:
            Updates a pipeline stage: its name, what it deploys to, how it obtains the snapshot it passes on, and its git settings. Fields you omit keep their stored value, except the git settings, which are applied as a set.
            Rebinding the target replaces the previous binding, and the same ordering rules as adding apply: a device group cannot be the first stage, and an instance or device cannot come after a device group.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            pipelineId: z.string().describe('The hashid of the pipeline the stage belongs to'),
            stageId: z.string().describe('The hashid of the stage to update'),
            name: z.string().min(1).optional().describe('New name for the stage'),
            instanceId: z.string().uuid().optional().describe('UUID of the hosted instance to rebind this stage to. Pass at most one target'),
            deviceId: z.string().optional().describe('Hashid of the remote instance (device) to rebind this stage to. Pass at most one target'),
            deviceGroupId: z.string().optional().describe('Hashid of the device group to rebind this stage to. Pass at most one target'),
            ...gitStageFields({ forUpdate: true }),
            deployToDevices,
            action: stageAction
        },
        handler: async (args, { inject }) => {
            const payload = {}
            for (const key of stagePayloadKeys) {
                if (args[key] !== undefined) {
                    payload[key] = args[key]
                }
            }
            // The route only applies git settings inside its rebinding branch, and that
            // branch is triggered by instanceId/deviceId/deviceGroupId being present in the
            // body. Mirror the frontend, which sends a blank deviceGroupId alongside git
            // updates, so a git-only update still lands.
            if (payload.gitTokenId && payload.instanceId === undefined && payload.deviceId === undefined && payload.deviceGroupId === undefined) {
                payload.deviceGroupId = ''
            }
            const response = await inject({ method: 'PUT', url: `/api/v1/pipelines/${args.pipelineId}/stages/${args.stageId}`, payload })
            return response
        }
    },
    {
        name: 'platform_deploy_pipeline_stage',
        title: 'Deploy Pipeline Stage',
        description: `FlowFuse platform automation tool:
            Deploys a pipeline stage to the NEXT stage in the pipeline: stageId is the SOURCE stage, and its snapshot (obtained per the stage's action) is pushed to whatever the following stage targets. Fails with not_found when the stage has no next stage.
            Deploying to an instance, device or device group replies 200 { status: "importing" } as soon as the deploy has STARTED - it completes in the background, so check the target's status afterwards (for example platform_get_hosted_instance_status) to confirm it finished. A stage whose action is none (and that has no git repository) replies { status: "okay" } and does nothing.
            Only a team Owner can deploy to a protected instance; other roles get a 403 protected_instance.
            sourceSnapshotId is only used when the source stage's action is prompt, where it names the snapshot to deploy; other actions select the snapshot themselves.
            This overwrites what is running on the target. Confirm with the user before deploying.`,
        // destructiveHint: this replaces the flows running on the next stage's target
        // rather than adding to them, the same reasoning as
        // platform_set_instance_device_target, so it belongs behind destructive access.
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            pipelineId: z.string().describe('The hashid of the pipeline'),
            stageId: z.string().describe('The hashid of the SOURCE stage to deploy from; the deploy lands on the stage after it'),
            sourceSnapshotId: z.string().optional().describe('The hashid of the snapshot to deploy. Only used (and required) when the source stage action is prompt')
        },
        handler: async (args, { inject }) => {
            const payload = {}
            if (args.sourceSnapshotId !== undefined) {
                payload.sourceSnapshotId = args.sourceSnapshotId
            }
            const response = await inject({ method: 'PUT', url: `/api/v1/pipelines/${args.pipelineId}/stages/${args.stageId}/deploy`, payload })
            return response
        }
    }
]
