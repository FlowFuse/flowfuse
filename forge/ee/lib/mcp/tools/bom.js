const { teamId, applicationId } = require('../schemas')

module.exports = [
    {
        name: 'platform_get_team_bill_of_materials',
        title: 'Get Team Bill of Materials',
        description: `FlowFuse platform automation tool:
            Reads the bill of materials for a team: the applications, hosted and remote instances,
            and their dependencies across the team. This is a team level gated feature which defaults
            to disabled; when disabled for the team the request returns a "Feature not enabled" error.
            Results include only the applications you have access to.
            The "state" on a remote instance (device) entry is its desired state, not whether it is currently online. A
            device set to run reports "running" here even while it is offline; call platform_get_remote_instance and read
            liveStatus to find out whether it is actually reachable.
            The whole team is returned in one response with every dependency of every instance inlined, and it cannot be
            paged. For a large team this is a very long result - prefer platform_get_application_bill_of_materials when
            you only care about one application.`,
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
        name: 'platform_get_application_bill_of_materials',
        title: 'Get Application Bill of Materials',
        description: `FlowFuse platform automation tool:
            Reads the bill of materials for a single application: its hosted and remote instances
            and their dependencies. This is a team level gated feature which defaults to disabled;
            when disabled for the team the request returns a "Feature not enabled" error.
            The "state" on a remote instance (device) entry is its desired state, not whether it is currently online. A
            device set to run reports "running" here even while it is offline; call platform_get_remote_instance and read
            liveStatus to find out whether it is actually reachable.`,
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
