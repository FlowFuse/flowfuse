module.exports.init = async function (app) {
    app.config.features.register('autoStackUpdate', true, true)

    app.housekeeper.registerTask(require('./tasks/upgrade-stack'))
}
