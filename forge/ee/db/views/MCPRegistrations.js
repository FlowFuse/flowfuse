let app

module.exports = {
    init: (appInstance) => {
        app = appInstance
        app.addSchema({
            $id: 'MCPRegistrationSummary',
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                protocol: { type: 'string' },
                targetType: { type: 'string', enum: ['instance', 'device'] },
                targetId: { type: 'string' },
                nodeId: { type: 'string' },
                endpointRoute: { type: 'string' },
                teamId: { type: 'string' },
                title: { type: 'string' },
                version: { type: 'string' },
                description: { type: 'string' }
            }
        })
        app.addSchema({
            $id: 'MCPRegistrationSummaryList',
            type: 'array',
            servers: { $ref: 'MCPRegistrationSummary' }
        })
    },

    MCPRegistrationSummary (registrationModel) {
        const { name, protocol, targetType, targetId, nodeId, endpointRoute, TeamId, hashid, title, version, description } = registrationModel
        const teamId = app.db.models.Team.encodeHashid(+TeamId)
        const result = {
            id: hashid,
            name,
            protocol,
            targetType,
            targetId,
            nodeId,
            endpointRoute,
            teamId,
            title,
            version,
            description
        }
        return result
    },

    MCPRegistrationSummaryList (registrationsArray) {
        return registrationsArray.map(this.MCPRegistrationSummary)
    }
}
