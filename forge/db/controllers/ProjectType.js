module.exports = {
    createDefaultProjectType: async function (app) {
        return await app.db.models.ProjectType.create({
            name: 'Default',
            active: true,
            order: 1,
            description: '',
            properties: {}
        })
    }
}
