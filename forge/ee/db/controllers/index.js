const modelTypes = [
    'Subscription',
    'UserBillingCode',
    'Pipeline'
]

async function init (app) {
    modelTypes.forEach(type => {
        const m = require(`./${type}`)
        app.db.controllers[type] = {}
        for (const key in m) {
            app.db.controllers[type][key] = m[key].bind(m, app)
        }
    })
}

module.exports.init = init
