module.exports = {
    async updateOrCreateForProject (app, project, newFlows = {}, { transaction } = {}) {
        let currentProjectFlows = await app.db.models.StorageFlow.byProject(project.id)
        if (currentProjectFlows) {
            // Note StorageFlow.flow not .flows
            currentProjectFlows.flow = newFlows
            await currentProjectFlows.save({ transaction })
        } else {
            currentProjectFlows = await app.db.models.StorageFlow.create({
                ProjectId: project.id,
                flow: newFlows
            }, { transaction })
        }

        return currentProjectFlows
    }
}
