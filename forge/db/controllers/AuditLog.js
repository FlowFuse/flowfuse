function encodeBody (body) {
    if (body !== undefined) {
        const result = JSON.stringify(body)
        if (result !== '{}') {
            return result
        }
    }
}

function addToLog (app, entityType, entityId, event, body) {
    const details = [`event: ${event}`]
    if (entityType) { details.push(`type: ${entityType}`) }
    if (entityId) { details.push(`id: ${entityId}`) }
    const msg = details.join(', ')
    if (body && body.error) {
        app.log.error(`AUDIT: ${msg}, ${body.error.message || 'unknown error'}`)
    } else {
        app.log.info(`AUDIT: ${msg}`)
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
        addToLog(app, 'platform', null, event, body)
    },
    userLog: async function (app, UserId, event, body, entityId) {
        await app.db.models.AuditLog.create({
            entityType: 'user',
            entityId: entityId || null,
            UserId,
            event,
            body: encodeBody(body)
        })
        addToLog(app, 'user', entityId, event, body)
    },
    projectLog: async function (app, ProjectId, UserId, event, body) {
        await app.db.models.AuditLog.create({
            entityType: 'project',
            entityId: ProjectId,
            UserId,
            event,
            body: encodeBody(body)
        })
        addToLog(app, 'project', ProjectId, event, body)
    },
    teamLog: async function (app, TeamId, UserId, event, body) {
        await app.db.models.AuditLog.create({
            entityType: 'team',
            entityId: TeamId,
            UserId,
            event,
            body: encodeBody(body)
        })
        addToLog(app, 'team', TeamId, event, body)
    }
}
