
module.exports = {
    getSetting: function (app, teamType, key) {
        return app.config.teams?.[teamType.name]?.[key]
    }
}
