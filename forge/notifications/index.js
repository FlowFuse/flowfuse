const fp = require('fastify-plugin')

module.exports = fp(async function (app, _opts) {
    /**
     * Send a user a notification
     * @param {User} user who the notification is for
     * @param {string} type the type of the notification
     * @param {Object} data meta data for the notification - specific to the type
     * @param {string} reference a key that can be used to lookup this notification, for example: `invite:HASHID`
     *
     */
    async function send (user, type, data, reference = null) {
        return app.db.models.Notification.create({
            UserId: user.id,
            type,
            reference,
            data
        })
    }

    /**
     * Remove a notification for a user with the given reference.
     * For example, when an invite is accepted/rejected, we can clear the associated notification
     * @param {User} user
     * @param {string} reference
     */
    async function remove (user, reference) {
        const notification = await app.db.models.Notification.byReference(reference, user)
        if (notification) {
            await notification.destroy()
        }
    }

    app.decorate('notifications', {
        send,
        remove
    })
}, { name: 'app.notifications' })
