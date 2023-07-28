module.exports = function (app) {
    app.addSchema({
        $id: 'TeamTypeSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            active: { type: 'boolean' }
        }
    })
    function teamTypeSummary (teamType) {
        return {
            id: teamType.hashid,
            name: teamType.name,
            active: teamType.active
        }
    }

    app.addSchema({
        $id: 'TeamType',
        type: 'object',
        allOf: [{ $ref: 'TeamTypeSummary' }],
        properties: {
            order: { type: 'number' },
            description: { type: 'string' },
            teamCount: { type: 'number' },
            properties: {
                type: 'object',
                properties: {
                    users: { type: 'object', additionalProperties: true },
                    devices: { type: 'object', additionalProperties: true },
                    features: { type: 'object', additionalProperties: true },
                    instances: { type: 'object', additionalProperties: true },
                    billing: { type: 'object', additionalProperties: true }
                },
                additionalProperties: true
            }
        }
    })

    function removeAdminOnlyProps (obj) {
        const result = {}
        for (const [key, value] of Object.entries(obj)) {
            if (/^(price|product)Id$/.test(key)) {
                continue
            }
            if (typeof value === 'object' && value !== null) {
                result[key] = removeAdminOnlyProps(value)
            } else {
                result[key] = value
            }
        }
        return result
    }

    function teamType (teamType, includeAdminOnlyProps) {
        let properties
        if (!includeAdminOnlyProps) {
            properties = removeAdminOnlyProps(teamType.properties || {})
        } else {
            properties = { ...teamType.properties }
        }
        if (app.license.active() && app.billing) {
            // properties.billing = {
            //     userCost: app.config.billing.stripe.teams[teamType.name]?.userCost || 0,
            //     deviceCost: app.config.billing.stripe.deviceCost || 0
            // }
        }
        const result = {
            id: teamType.hashid,
            name: teamType.name,
            active: teamType.active,
            order: teamType.order,
            description: teamType.description,
            properties
        }
        if (includeAdminOnlyProps && teamType.get) {
            // For some API calls, the teamType passed here is a raw Object, not
            // a sequelize wrapped object. So we have to guard access to
            // the 'get' function
            result.teamCount = teamType.get('teamCount')
        }
        return result
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
