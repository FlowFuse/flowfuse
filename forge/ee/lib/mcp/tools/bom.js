const { teamId, applicationId } = require('../schemas')

module.exports = [
    {
        name: 'platform_get_team_bom',
        title: 'Get Team Bill of Materials',
        description: `FlowFuse platform automation tool:
            Reads the bill of materials for a team: the applications, instances, and their
            dependencies across the team. This is plan-gated on the bom feature, which defaults
            to disabled; when disabled for the team the request returns a "Feature not enabled" error.
            Results include only the applications you have access to.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/bom` })
            return response
        }
    },
    {
        name: 'platform_get_application_bom',
        title: 'Get Application Bill of Materials',
        description: `FlowFuse platform automation tool:
            Reads the bill of materials for a single application: its instances and their dependencies.
            This is plan-gated on the bom feature, which defaults to disabled; when the team's plan
            has this feature disabled the request returns a "Feature not enabled" error.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            applicationId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/applications/${args.applicationId}/bom` })
            return response
        }
    }
]
