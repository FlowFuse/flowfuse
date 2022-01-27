module.exports = {
    auditLog: function (app, logEntries) {
        logEntries.log = logEntries.log.map(e => {
            return {
                id: e.hashid,
                createdAt: e.createdAt,
                username: e.User ? e.User.username : null,
                event: e.event,
                body: e.body
            }
        })
        return logEntries
    }
}
