function encodeBody (body) {
    if (body !== undefined) {
        const result = JSON.stringify(body)
        if (result !== '{}') {
            return result
        }
    }
}

module.exports = {
    platformLog: async function (app, UserId, event, body) {
        await app.db.models.AuditLog.create({
            entityType: 'platform',
            entityId: null,
            UserId,
            event,
            body: encodeBody(body)
        })
    },
    userLog: async function (app, UserId, event, body, entityId) {
        await app.db.models.AuditLog.create({
            entityType: 'user',
            entityId: entityId || null,
            UserId,
            event,
            body: encodeBody(body)
        })
    },
    projectLog: async function (app, ProjectId, UserId, event, body) {
        await app.db.models.AuditLog.create({
            entityType: 'project',
            entityId: ProjectId,
            UserId,
            event,
            body: encodeBody(body)
        })
    },
    teamLog: async function (app, TeamId, UserId, event, body) {
        await app.db.models.AuditLog.create({
            entityType: 'team',
            entityId: TeamId,
            UserId,
            event,
            body: encodeBody(body)
        })
    }
}
