module.exports = {
    createDefaultProjectStack: async function (app, projectType) {
        const properties = app.containers.getDefaultStackProperties()
        console.log(properties)
        let name = 'Default'
        let label = 'Default'
        if (properties.nodered) {
            label = `Node-RED ${properties.nodered}`
            name = label.toLowerCase().replace(/[ .]/g, '-')
        }
        const stack = await app.db.models.ProjectStack.create({
            name,
            label,
            active: true,
            order: 1,
            description: '',
            properties
        })
        await stack.setProjectType(projectType)
        return stack
    }
}
