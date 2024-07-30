module.exports = function (app) {
    app.addSchema({
        $id: 'Notification',
        type: 'object',
        properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            createdAt: { type: 'string' },
            read: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true }
        }
    })
    app.addSchema({
        $id: 'NotificationList',
        type: 'array',
        items: {
            $ref: 'Notification'
        }
    })

    function notificationList (notifications) {
        return notifications.map(notification => {
            return {
                id: notification.hashid,
                type: notification.type,
                createdAt: notification.createdAt,
                read: notification.read,
                data: notification.data
            }
        })
    }

    return {
        notificationList
    }
}
