module.exports = async (app) => {
    return {
        'platform.counts.users': await app.db.models.User.count(),
        'platform.counts.teams': await app.db.models.Team.count(),
        'platform.counts.projects': await app.db.models.Project.count()
    }
}
