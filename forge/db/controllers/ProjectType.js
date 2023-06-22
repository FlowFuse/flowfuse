module.exports = {
    createDefaultProjectType: async function (app) {
        const [projectType] = await app.db.models.ProjectType.findOrCreate({
            where: {
                name: 'Default',
                active: true
            },
            defaults: {
                active: true,
                order: 1,
                description: '',
                properties: {}
            }
        })

        return projectType
    }
}
