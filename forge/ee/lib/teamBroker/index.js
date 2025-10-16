const { LRUCache } = require('lru-cache')

module.exports.init = async function (app) {
    // enable Team Broker Feature
    if (app.config.broker?.teamBroker?.enabled) {
        app.config.features.register('teamBroker', true, true)
        app.config.features.register('externalBroker', true, true)
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
            const max = this.getProperty('teamBroker.clients.limit', -1)
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

    /**
     * Used by the Team Broker ACL route to record a topic as being in use
     * @param {String} topic the topic being published to
     * @param {String} team the team hashid of the broker being published to
     */
    async function addUsedTopic (topic, team) {
        const teamId = app.db.models.Team.decodeHashid(team)
        const cacheHit = topicCache.get(`${teamId}#${topic}`)
        if (!cacheHit) {
            await app.db.models.MQTTTopicSchema.upsert({
                topic,
                TeamId: teamId,
                BrokerCredentialsId: app.settings.get('team:broker:creds') ?? null
            }, {
                topic,
                TeamId: teamId,
                BrokerCredentialsId: app.settings.get('team:broker:creds') ?? null
            })
            topicCache.set(`${teamId}#${topic}`, true)
        }
    }

    const topicCache = new LRUCache({
        max: 5000,
        ttl: 1000 * 60 * 30 // 30 min grace period
    })
    try {
        const topics = await app.db.models.MQTTTopicSchema.findAll({
            where: {
                BrokerCredentialsId: app.settings.get('team:broker:creds')
            },
            attributes: ['TeamId', 'topic'],
            order: [['updatedAt', 'DESC']],
            limit: 5000
        })
        for (const topic of topics) {
            topicCache.set(`${topic.teamId}#${topic.topic}`, true)
        }
    } catch (err) {
        app.log.debug(`Error populating Team Broker Topic Cache ${err.toString()}`)
    }

    app.decorate('teamBroker', {
        addUsedTopic
    })
}
