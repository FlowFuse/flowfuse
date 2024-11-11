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
    const TOPIC_TTL = (1000 * 60 * 60 * 25) // 25 hours
    // const TOPIC_CLEAN_INTERVAL = (1000 * 30)
    const topicsList = {}

    async function expireTopicCache () {
        const now = Date.now()
        const keys = Object.keys(topicsList)
        for (let i = 0; i < keys.length; i++) {
            const teamTopics = Object.keys(topicsList[keys[i]])
            for (let j = 0; j < teamTopics.length; j++) {
                if (topicsList[keys[i]][teamTopics[j]].ttl < now) {
                    delete topicsList[keys[i]][teamTopics[j]]
                }
            }
        }
    }

    // const cleanInterval = setInterval( expireTopicCache, TOPIC_CLEAN_INTERVAL)
    // app.addHook('onClose', async () => {
    //     if (cleanInterval) {
    //         clearInterval(cleanInterval)
    //     }
    // })

    async function addUsedTopic (topic, team) {
        const teamList = topicsList[team]
        if (!teamList) {
            topicsList[team] = {
                [topic]: { ttl: Date.now() + (TOPIC_TTL) }
            }
        } else {
            teamList[topic] = { ttl: Date.now() + (TOPIC_TTL) }
        }
    }

    async function getUsedTopics (teamId) {
        const topics = topicsList[teamId] ? Object.keys(topicsList[teamId]) : []
        return topics
    }

    app.decorate('teamBroker', {
        addUsedTopic,
        getUsedTopics,
        expireTopicCache
    })
}
