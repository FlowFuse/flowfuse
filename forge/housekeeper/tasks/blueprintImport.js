const axios = require('axios')

const { randomInt } = require('../utils')

async function fetch (app) {
    try {
        const url = app.config.blueprintImport.url || "https://flowfuse.com/api/v1/flow-blueprints/export-public"
        const blueprints = await axios.get(app.config.blueprintImport.url, {})
        console.log(blueprints.data) 
    } catch (err) {
        console.log('Error fetching blueprints', err)
    }
}

module.exports = {
    name: 'blueprintImport',
    startup: 10000,
    // Pick a random hour/minute for this task to run at. If the application is
    // horizontal scaled, this will avoid two instances running at the same time
    schedule: `${randomInt(0, 59)} ${randomInt(0, 23)} * * *`,
    run: async function (app) {
        console.log('Testing blueprint import')
        if (app.license.active() && app.config.blueprintImport.enabled) {
            await fetch(app)
        }
    }
}