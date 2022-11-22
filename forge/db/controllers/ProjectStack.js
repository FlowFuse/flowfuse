module.exports = {
    createDefaultProjectStack: async function (app, projectType) {
        const properties = app.containers.getDefaultStackProperties()
        const stack = await app.db.models.ProjectStack.create({
            name: 'default',
            label: 'default',
            active: true,
            order: 1,
            description: '',
            properties
        })
        await stack.setProjectType(projectType)
        return stack
    }
}
