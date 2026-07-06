const { z } = require('zod')

const { teamId, applicationId } = require('../schemas')

module.exports = [
    {
        name: 'platform_list_team_pipelines',
        title: 'List Team Pipelines',
        description: `FlowFuse platform automation tool:
            Lists the DevOps pipelines that exist for a team.
            Results are filtered to the applications you can access, so a scoped access token
            sees only its in-scope subset of pipelines rather than an error.
            Use this to discover which pipelines exist before inspecting a specific pipeline's stages.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/pipelines` })
            return response
        }
    },
    {
        name: 'platform_list_application_pipelines',
        title: 'List Application Pipelines',
        description: `FlowFuse platform automation tool:
            Lists the DevOps pipelines belonging to a specific application.
            Use this when you already know the application and want its pipelines,
            rather than filtering the full team pipeline list.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            applicationId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/applications/${args.applicationId}/pipelines` })
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
