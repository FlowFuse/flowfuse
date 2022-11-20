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
            const scope = e.scope
            if (scope.type !== 'platform' && scope.type !== 'project') {
                const model = `${scope.type[0].toUpperCase()}${scope.type.slice(1)}`
                if (app.db.models[model]) {
                    scope.id = app.db.models[model].encodeHashid(scope.id)
                }
            }
            return {
                id: e.hashid,
                createdAt: e.createdAt,
                username: e.User ? e.User.username : null, // Kept for compatibility. To remove once UI complete
                event: e.event,
                scope,
                trigger: sanitiseObjectIds(e.trigger),
                body: e.body
            }
        })
        return logEntries
    }
}
