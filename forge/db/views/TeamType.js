module.exports = {
    teamType: function (app, teamType) {
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
    },
    teamTypeSummary: function (app, teamType) {
        return {
            id: teamType.hashid,
            name: teamType.name
        }
    }
}
