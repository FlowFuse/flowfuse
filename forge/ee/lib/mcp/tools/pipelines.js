const { z } = require('zod')

module.exports = [
    {
        name: 'platform_list_pipelines',
        title: 'List Pipelines',
        description: `FlowFuse platform automation tool:
            Lists the DevOps pipelines for either a team or a single application.
            Provide a teamId to list every pipeline in the team, or an applicationId to list
            only the pipelines belonging to that application. Provide exactly one of the two.
            Team results are filtered to the applications you can access, so a scoped access token
            sees only its in-scope subset of pipelines rather than an error.
            Use this to discover which pipelines exist before inspecting a specific pipeline's stages.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId: z.string().optional().describe('List the pipelines in this team. Provide exactly one of teamId or applicationId.'),
            applicationId: z.string().optional().describe('List the pipelines in this application. Provide exactly one of teamId or applicationId.')
        },
        handler: async (args, { inject }) => {
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
        annotations: { readOnlyHint: true, destructiveHint: false },
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
