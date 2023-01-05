module.exports = {
    snapshot: function (app, snapshot) {
        if (snapshot) {
            const result = snapshot.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                description: result.description || '',
                createdAt: result.createdAt,
                updatedAt: result.updatedAt
            }
            if (snapshot.User) {
                filtered.user = app.db.views.User.shortProfile(snapshot.User)
            }
            if (snapshot.settings?.modules) {
                filtered.modules = snapshot.settings.modules
            }
            return filtered
        } else {
            return null
        }
    }
}
