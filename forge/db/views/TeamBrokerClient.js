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
            acls: JSON.parse(result.acls),
            owner: null
        }
        if (result.ownerType === 'device') {
            filtered.owner = {
                instanceType: 'device',
                id: u.Device?.hashid || app.db.models.Device.encodeHashid(u.ownerId),
                name: result.Device?.name || app.db.models.Device.encodeHashid(u.ownerId),
                type: result.Device?.type
            }
        } else if (result.ownerType === 'project') {
            filtered.owner = {
                instanceType: 'instance',
                id: u.Project?.id || u.ownerId,
                name: result.Project?.name || u.ownerId
            }
        }
        return filtered
    }
}
