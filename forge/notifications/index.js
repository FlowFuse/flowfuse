const fp = require('fastify-plugin')

module.exports = fp(async function (app, _opts) {
    /**
     * Send a user a notification
     * @param {User} user who the notification is for
     * @param {string} type the type of the notification
     * @param {Object} data meta data for the notification - specific to the type
     * @param {string} reference a key that can be used to lookup this notification, for example: `invite:HASHID`
     * @param {Object} [options]
     * @param {boolean} [options.upsert] if true, updates the existing notification with the same reference & adds/increments `data.meta.counter`
     * @param {boolean} [options.supersede] if true, marks existing notification (with the same reference) as read & adds a new one
     */
    async function send (user, type, data, reference = null, options = null) {
        if (reference && options && typeof options === 'object') {
            if (options.upsert) {
                const existing = await app.db.models.Notification.byReference(reference, user)
                if (existing && !existing.read) {
                    const updatedData = Object.assign({}, existing.data, data)
                    if (!updatedData.meta || typeof updatedData.meta !== 'object') {
                        updatedData.meta = {}
                    }
                    if (typeof updatedData.meta.counter === 'number') {
                        updatedData.meta.counter += 1
                    } else {
                        updatedData.meta.counter = 2 // if notification already exists, then this is the 2nd occurrence!
                    }
                    await existing.update({ data: updatedData })
                    return existing
                }
            } else if (options.supersede) {
                const existing = await app.db.models.Notification.byReference(reference, user)
                if (existing && !existing.read) {
                    existing.read = true
                    await existing.save()
                }
            }
        }

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
