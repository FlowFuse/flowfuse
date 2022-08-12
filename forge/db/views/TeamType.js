module.exports = {
    teamType: function (app, teamType) {
        const properties = { ...teamType.properties }
        if (app.config.billing?.stripe.teams?.[teamType.name]) {
            properties.billing = {
                userCost: app.config.billing.stripe.teams[teamType.name].userCost || 0
            }
        }
        return {
            id: teamType.hashid,
            name: teamType.name,
            description: teamType.description,
            properties: properties
        }
    },
    teamTypeSummary: function (app, teamType) {
        return {
            id: teamType.hashid,
            name: teamType.name
        }
    }
}
