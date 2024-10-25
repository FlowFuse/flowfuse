module.exports.init = function (app) {
    // enable Team Broker Feature
    if (app.config.broker?.teamBroker?.enabled) {
        app.config.features.register('teamBroker', true, true)
    }

    /*
     * need to add functions here to boot clients when team
     * or when client creds removed
     */
    app.db.models.Team.prototype.checkTeamBrokerClientCreateAllowed = async function () {
        if (this.suspended) {
            const err = new Error()
            err.code = 'team_suspended'
            err.error = 'Team suspended'
            throw err
        }
        await this.ensureTeamTypeExists()
        const teamType = await this.getTeamType()
        if (teamType.getFeatureProperty('teamBroker', false)) {
            const clientCount = await app.db.models.TeamBrokerClient.countTeam(this.hashid)
            const max = teamType.getProperty('teamBroker.clients.limit', -1)
            if (max > -1) {
                if (clientCount >= max) {
                    const err = new Error()
                    err.code = 'broker_client_limit_reached'
                    err.error = 'Team Broker client limit reached'
                    throw err
                }
            }
        }
    }
}
