module.exports = {
    createDefaultProjectStack: async function (app, projectType, stackOverrides) {
        const properties = { ...app.containers.getDefaultStackProperties(), ...stackOverrides }
        let name = 'Default'
        let label = 'Default'
        if (properties.nodered) {
            label = `Node-RED ${properties.nodered}`
            name = label.toLowerCase().replace(/[ .]/g, '-')
        }
        const [stack] = await app.db.models.ProjectStack.findOrCreate({
            where: {
                name,
                active: true
            },
            defaults: {
                label,
                properties
            }
        })
        await stack.setProjectType(projectType)
        return stack
    }
}
