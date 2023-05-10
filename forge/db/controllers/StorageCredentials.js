
module.exports = {
    async updateOrCreateForProject (app, project, newCredentials = {}, { transaction } = {}) {
        let origCredentials = await app.db.models.StorageCredentials.byProject(project.id)
        if (origCredentials) {
            origCredentials.credentials = JSON.stringify(newCredentials)
            await origCredentials.save({ transaction })
        } else {
            origCredentials = await app.db.models.StorageCredentials.create({
                ProjectId: project.id,
                credentials: JSON.stringify(newCredentials)
            }, { transaction })
        }

        return origCredentials
    }
}
