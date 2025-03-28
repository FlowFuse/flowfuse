const modelTypes = [
    'SAMLProvider',
    'Pipeline',
    'PipelineStage',
    'FlowTemplate',
    'GitToken'
]

async function init (app) {
    modelTypes.forEach(type => {
        const m = require(`./${type}`)
        app.db.views.register(app, type, m)
    })
}
module.exports.init = init
