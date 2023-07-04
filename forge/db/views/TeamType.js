module.exports = function (app) {
    app.addSchema({
        $id: 'TeamTypeSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' }
        }
    })
    function teamTypeSummary (teamType) {
        return {
            id: teamType.hashid,
            name: teamType.name
        }
    }

    app.addSchema({
        $id: 'TeamType',
        type: 'object',
        allOf: [{ $ref: 'TeamTypeSummary' }],
        properties: {
            description: { type: 'string' },
            properties: {
                type: 'object',
                properties: {
                    billing: {
                        type: 'object',
                        properties: {
                            userCost: { type: 'number' },
                            deviceCost: { type: 'number' }
                        }
                    }
                },
                additionalProperties: true
            }
        }
    })
    function teamType (teamType) {
        const properties = { ...teamType.properties }
        if (app.license.active() && app.billing) {
            properties.billing = {
                userCost: app.config.billing.stripe.teams[teamType.name].userCost || 0,
                deviceCost: app.config.billing.stripe.deviceCost || 0
            }
        }
        return {
            id: teamType.hashid,
            name: teamType.name,
            description: teamType.description,
            properties
        }
    }
    app.addSchema({
        $id: 'TeamTypeList',
        type: 'array',
        items: {
            $ref: 'TeamType'
        }
    })

    return {
        teamType,
        teamTypeSummary
    }
}
