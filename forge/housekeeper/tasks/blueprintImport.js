const axios = require('axios')

const { randomInt } = require('../utils')

async function fetch (app) {
    try {
        const url = app.config.blueprintImport.url || "https://flowfuse.com/api/v1/flow-blueprints/export-public"
        const blueprints = await axios.get(app.config.blueprintImport.url, {})
        const existingBlueprints = await app.db.models.FlowTemplate.getAll()
        for (const blueprint of blueprints.data.blueprints) {
            const existingBlueprint = existingBlueprints.templates.find(b => b.name === blueprint.name)
            if (existingBlueprint) {
                console.log(`Blueprint ${blueprint.name} already exists`)
                //await app.db.models.FlowTemplate.update(existingBlueprint.id, blueprint)
            } else {
                blueprint.order = 0
                blueprint.default = false
                blueprint.active = true
                console.log(`Creating new blueprint ${blueprint.name}`)
                await app.db.models.FlowTemplate.create(blueprint)
            }
        }
    } catch (err) {
        console.log('Error fetching blueprints', err)
    }
}

module.exports = {
    name: 'blueprintImport',
    startup: 30000,
    // Pick a random hour/minute for this task to run at. If the application is
    // horizontal scaled, this will avoid two instances running at the same time
    // and on a random day of the week.
    schedule: `${randomInt(0, 59)} ${randomInt(0, 23)} * * ${randomInt(0, 6)}`,
    run: async function (app) {
        console.log('Testing blueprint import')
        if (app.license.active() && app.config.blueprintImport.enabled) {
            await fetch(app)
        }
    }
}