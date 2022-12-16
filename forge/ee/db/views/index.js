const modelTypes = [
    'SAMLProvider'
]

async function init (app) {
    modelTypes.forEach(type => {
        const m = require(`./${type}`)
        app.db.views[type] = {}
        for (const key in m) {
            app.db.views[type][key] = m[key].bind(m, app)
        }
    })
}
module.exports.init = init
