module.exports.getNotifications = async (app, request) => {
    const paginationOptions = app.getPaginationOptions(request)
    const notifications = await app.db.models.Notification.forUser(request.session.User, paginationOptions)

    notifications.notifications = app.db.views.Notification.notificationList(notifications.notifications)

    return notifications
}
