const { z } = require('zod')

const { teamId, applicationId, toolError } = require('../schemas')

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
    }
]
