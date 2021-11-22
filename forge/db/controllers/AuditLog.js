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
    projectLog: async function(db, ProjectId, UserId, event, body) {

        await db.models.AuditLog.create({
            entityType: "project",
            entityId: ProjectId,
            UserId,
            event,
            body: encodeBody(body)
        })
    },
    teamLog: async function(db, TeamId, UserId, event, body) {
        await db.models.AuditLog.create({
            entityType: "team",
            entityId: TeamId,
            UserId,
            event,
            body: encodeBody(body)
        })
    }

}
