const sanitiseObjectIds = (obj) => {
    if (obj && obj.hashid) {
        obj.id = obj.hashid
        delete obj.hashid
    }
    return obj
}
module.exports = {
    auditLog: function (app, logEntries) {
        logEntries.log = logEntries.log.map(e => {
            e = app.auditLog.formatters.formatLogEntry(e)
            return {
                id: e.hashid,
                createdAt: e.createdAt,
                username: e.User ? e.User.username : null, // Kept for compatibility. To remove once UI complete
                event: e.event,
                scope: e.scope,
                trigger: sanitiseObjectIds(e.trigger),
                body: e.body
            }
        })
        return logEntries
    }
}
