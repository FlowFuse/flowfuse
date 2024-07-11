const fp = require('fastify-plugin')

module.exports = fp(async function (app, _opts) {
    /**
     * Send a user a notification
     * @param {User} user who the notification is for
     * @param {string} type the type of the notification
     * @param {Object} data meta data for the notification - specific to the type
     */
    async function send (user, type, data) {
        return app.db.models.Notification.create({
            UserId: user.id,
            type,
            data
        })
    }

    app.decorate('notifications', {
        send
    })
}, { name: 'app.notifications' })
