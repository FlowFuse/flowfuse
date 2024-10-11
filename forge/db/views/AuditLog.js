const sanitiseObjectIds = (obj) => {
    if (obj && obj.hashid) {
        obj.id = obj.hashid
        delete obj.hashid
    }
    return obj
}
module.exports = function (app) {
    app.addSchema({
        $id: 'AuditLogEntry',
        type: 'object',
        properties: {
            id: { type: 'string' },
            createdAt: { type: 'string' },
            username: { type: 'string' },
            event: { type: 'string' },
            scope: { type: 'object', additionalProperties: true },
            trigger: { type: 'object', additionalProperties: true },
            body: { type: 'object', additionalProperties: true }
        }
    })
    app.addSchema({
        $id: 'AuditLogEntryList',
        type: 'array',
        items: {
            $ref: 'AuditLogEntry'
        }
    })
    app.addSchema({
        $id: 'AuditLogQueryParams',
        type: 'object',
        properties: {
            // `event` can be a string or an array of strings (e.g. ['project.snapshot.device-target-set', 'project.snapshot.deviceTarget'])
            // this is to handle legacy log entries that have multiple events
            // One such example is the legacy entry 'project.snapshot.deviceTarget' which is now called 'project.snapshot.device-target-set'
            // this results in a querystring of ?event=project.snapshot.deviceTarget&event=project.snapshot.device-target-set
            event: { anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            username: { type: 'string' }
        }
    })
    function auditLog (logEntries) {
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
    app.addSchema({
        $id: 'TimelineEntry',
        type: 'object',
        properties: {
            id: { type: 'string' },
            createdAt: { type: 'string' },
            user: { $ref: 'User' },
            event: { type: 'string' },
            data: { type: 'object', additionalProperties: true }
        }
    })

    app.addSchema({
        $id: 'TimelineList',
        type: 'array',
        items: {
            $ref: 'TimelineEntry'
        }
    })

    function timelineEntry (timelineEntry) {
        const logEntry = app.auditLog.formatters.formatLogEntry(timelineEntry)
        let user = logEntry.User
        if (!user && logEntry.trigger && logEntry.trigger.hashid) {
            user = logEntry.trigger
            user.username = user.username || user.name
            user.avatar = user.avatar || app.db.utils.generateUserAvatar(user.username)
        }
        // catch all for missing user
        user = user || { id: 0, type: 'system', hashid: 'system', name: 'FlowFuse Platform', username: 'System', avatar: '/avatar/camera.svg' }
        return {
            id: timelineEntry.hashid,
            createdAt: timelineEntry.createdAt,
            user: app.db.views.User.userSummary(user),
            event: logEntry.event,
            data: logEntry.body
        }
    }

    function timelineList (timeline) {
        return timeline.map(timelineEntry)
    }

    return {
        auditLog,
        timelineList
    }
}
