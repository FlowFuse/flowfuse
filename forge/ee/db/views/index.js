const modelTypes = [
    'SAMLProvider',
    'Pipeline',
    'PipelineStage',
    'FlowTemplate',
    'TeamBrokerUser'
]

async function init (app) {
    modelTypes.forEach(type => {
        const m = require(`./${type}`)
        app.db.views.register(app, type, m)
    })
}
module.exports.init = init
