module.exports = {
    auditLog: function (app, logEntries) {
        logEntries.log = logEntries.log.map(e => {
            return {
                id: e.hashid,
                createdAt: e.createdAt,
                username: e.User ? e.User.username : null, // Kept for compatibility. To remove once UI complete
                event: e.event,
                scope: e.scope,
                trigger: e.trigger,
                body: e.body
            }
        })
        return logEntries
    }
}
