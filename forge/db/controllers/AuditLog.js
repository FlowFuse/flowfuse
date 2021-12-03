function encodeBody(body) {
    if (body !== undefined) {
        const result = JSON.stringify(body);
        if (result !== "{}") {
            return result
        }
    }
    return
}

module.exports = {
    projectLog: async function(app, ProjectId, UserId, event, body) {

        await app.db.models.AuditLog.create({
            entityType: "project",
            entityId: ProjectId,
            UserId,
            event,
            body: encodeBody(body)
        })
    },
    teamLog: async function(app, TeamId, UserId, event, body) {
        await app.db.models.AuditLog.create({
            entityType: "team",
            entityId: TeamId,
            UserId,
            event,
            body: encodeBody(body)
        })
    }

}
