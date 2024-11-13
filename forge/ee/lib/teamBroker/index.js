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
    const TOPIC_CACHE_SYNC_INTERVAL = (5 * 60 * 1000) // 5 mins
    const topicsList = app.settings.get('team:broker:topics') || {}
    let topicListDirty = false

    async function expireTopicCache () {
        const now = Date.now()
        const keys = Object.keys(topicsList)
        for (let i = 0; i < keys.length; i++) {
            const teamTopics = Object.keys(topicsList[keys[i]])
            for (let j = 0; j < teamTopics.length; j++) {
                if (topicsList[keys[i]][teamTopics[j]].ttl < now) {
                    delete topicsList[keys[i]][teamTopics[j]]
                    topicListDirty = true
                }
            }
        }
        if (topicListDirty) {
            await app.settings.set('team:broker:topics', topicsList)
            topicListDirty = false
        }
    }

    // sync to the database every 5 mins if changed
    const topicSyncInterval = setInterval(async () => {
        if (topicListDirty) {
            await app.settings.set('team:broker:topics', topicsList)
            topicListDirty = false
        }
    }, TOPIC_CACHE_SYNC_INTERVAL)

    app.addHook('onClose', async () => {
        await app.settings.set('team:broker:topics', topicsList)
        if (topicSyncInterval) {
            clearInterval(topicSyncInterval)
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
        topicListDirty = true
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
