const axios = require('axios')

const { randomInt } = require('../utils')

async function fetch (app) {
    app.log.info('Checking for Blueprint updates')
    try {
        const url = app.config.blueprintImport?.url || 'https://app.flowfuse.com/api/v1/flow-blueprints/export-public'
        const blueprints = await axios.get(url, {})
        const existingBlueprints = await app.db.models.FlowTemplate.getAll()
        for (const blueprint of blueprints.data.blueprints) {
            const existingBlueprint = existingBlueprints.templates.find(b => b.name === blueprint.name)
            if (existingBlueprint) {
                if (existingBlueprint.importedId === blueprint.id) {
                    existingBlueprint.modules = blueprint.modules
                    existingBlueprint.flows = blueprint.flows
                    existingBlueprint.description = blueprint.description
                    existingBlueprint.category = blueprint.category
                    existingBlueprint.icon = blueprint.icon
                    // sequelize changed doesn't work with deep objects
                    // if (existingBlueprint.changed()) {
                    //     app.log.info(`Updating existing Blueprint ${blueprint.name}`)
                    //     await existingBlueprint.save()
                    // }
                }
            } else {
                blueprint.order = 0
                blueprint.default = false
                blueprint.active = true
                blueprint.importedId = blueprint.id
                blueprint.id = undefined
                app.log.info(`Creating new Blueprint ${blueprint.name}`)
                await app.db.models.FlowTemplate.create(blueprint)
            }
        }
    } catch (err) {
        app.log.error(`Error fetching Blueprints ${err.message}`)
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
        if (app.license.active() && app.config.blueprintImport?.enabled !== false) {
            await fetch(app)
        }
    }
}
