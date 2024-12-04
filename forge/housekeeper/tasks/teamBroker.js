module.exports = {
    name: 'cleanBrokerTopics',
    startup: false,
    schedule: '47 22 * * *', // 22:47 every day
    run: async function (app) {
        if (app.license.active() && app.config.broker?.teamBroker?.enabled) {
            await app.teamBroker.expireTopicCache()
        }
    }
}
