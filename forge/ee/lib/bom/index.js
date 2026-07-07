module.exports.init = async function (app) {
    app.config.features.register('autoNodeUpdate', true, true)

    app.housekeeper.registerTask(require('./tasks/cache-catalogues'))
}
