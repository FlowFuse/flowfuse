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

    /*
     * This needs moving to Redis at some point for multiple forge app
     * Instances. Redis will also survive a restart which with CI may
     * become a problem.
    */
    const TOPIC_TTL = (1000 * 60 * 60)
    const TOPIC_CLEAN_INTERVAL = (1000 * 30)
    const topicsList = {}

    const cleanInterval = setInterval(() => {
        const keys = Object.keys(topicsList)
        const now = Date.now()
        for (let i = 0; i < keys.length; i++) {
            if (topicsList[keys[i]].ttl < now) {
                delete topicsList[keys[i]]
            }
        }
    }, TOPIC_CLEAN_INTERVAL)

    app.addHook('onClose', async () => {
        if (cleanInterval) {
            clearInterval(cleanInterval)
        }
    })

    async function addUsedTopic (topic, team) {
        const teamList = topicsList[team]
        if (!teamList) {
            topicsList[team] = {
                [topic]: { ttl: Date.now() + (TOPIC_TTL) }
            }
        } else {
            teamList[topic] = { ttl: Date.now() + (TOPIC_TTL) }
        }
        // topicsList[`ff/v1/${team}/c/${topic}`] = {
        //     ttl: Date.now() + (TOPIC_TTL)
        // }
    }

    async function getUsedTopics (teamId) {
        // const prefixLength = `ff/v1/${teamId}/c/`.length
        // const topics = Object.keys(topicsList)
        //     .filter(t => t.startsWith(`ff/v1/${teamId}/c/`))
        //     .map(t => t.substring(prefixLength))
        console.log(topicsList)
        const topics = topicsList[teamId] ? Object.keys(topicsList[teamId]) : []
        return topics
    }

    app.decorate('teamBroker', {
        addUsedTopic,
        getUsedTopics
    })
}
