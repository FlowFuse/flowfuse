async function init (app) {
    await require('./models').init(app)
    await require('./views').init(app)
    await require('./controllers').init(app)
}

module.exports.init = init
