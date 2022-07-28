module.exports = async (app) => {
    return {
        'platform.counts.users': await app.db.models.User.count(),
        'platform.counts.teams': await app.db.models.Team.count(),
        'platform.counts.projects': await app.db.models.Project.count(),
        'platform.counts.devices': await app.db.models.Device.count(),
        'platform.counts.projectSnapshots': await app.db.models.ProjectSnapshot.count(),
        'platform.counts.projectTemplates': await app.db.models.ProjectStack.count(),
        'platform.counts.projectStacks': await app.db.models.ProjectTemplate.count(),
        'platform.config.driver': app.config.driver.type
    }
}
