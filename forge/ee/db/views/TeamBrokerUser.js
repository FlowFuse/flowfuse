module.exports = {
    users: function (app, users) {
        const filtered = []
        users.clients.forEach(u => {
            filtered.push(this.user(app, u))
        })
        users.clients = filtered
        return users
    },
    user: function (app, u) {
        const result = u.toJSON()
        const filtered = {
            id: result.hashid,
            username: result.username,
            acls: JSON.parse(result.acls)
        }
        return filtered
    }
}
