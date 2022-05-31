module.exports = {
    /**
     * Creates a snapshot of the current state of a project
     * @param {*} app
     * @param {*} project
     */
    createSnapshot: async function (app, project, user, options) {
        const projectExport = await app.db.controllers.Project.exportProject(project)
        const snapshot = await app.db.models.ProjectSnapshot.create({
            name: options.name || '',
            description: options.description || '',
            settings: {
                settings: projectExport.settings || {},
                env: projectExport.env || {},
                modules: projectExport.modules || {}
            },
            flows: {
                flows: projectExport.flows,
                credentials: projectExport.credentials
            },
            ProjectId: project.id,
            UserId: user.id
        })
        await snapshot.save()
        return snapshot
    }
}
