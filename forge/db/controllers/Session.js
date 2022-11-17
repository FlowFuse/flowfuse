const { generateToken } = require('../utils')

const HOUR = 1000 * 60 * 60
// This is the maximum time a user can be logged in for before being asked to reauth
const DEFAULT_WEB_SESSION_EXPIRY = HOUR * 24 * 7 // One week expiry
// If a session is inactive for this time, it will be expired
const DEFAULT_WEB_SESSION_IDLE_TIMEOUT = HOUR * 32 // 32 hours
// We only update the idle time if there is activity within this period prior
// to idle timeout. That avoids the need to update idle timeout on every single request
const DEFAULT_WEB_SESSION_IDLE_GRACE = HOUR * 31 // 31 hours

module.exports = {
    /**
     * Create a new session for the given username
     */
    createUserSession: async function (app, username) {
        const user = await app.db.models.User.byUsernameOrEmail(username)
        if (user && !user.suspended) {
            return app.db.models.Session.create({
                sid: generateToken(32, 'ffu'),
                expiresAt: Date.now() + DEFAULT_WEB_SESSION_EXPIRY,
                idleAt: Date.now() + DEFAULT_WEB_SESSION_IDLE_TIMEOUT,
                UserId: user.id
            })
        }
        return null
    },

    /**
     * Delete a session
     */
    deleteSession: async function (app, sid) {
        return app.db.models.Session.destroy({ where: { sid } })
    },

    /**
     * Get a session by its id. If the session has expired, it is deleted
     * and nothing returned.
     */
    getOrExpire: async function (app, sid) {
        let session = await app.db.models.Session.findOne({
            where: { sid },
            include: app.db.models.User
        })
        const now = Date.now()
        if (session) {
            if (session.expiresAt.getTime() < now) {
                if (!session.refreshToken) {
                    // A web login session that can be removed
                    await session.destroy()
                }
                session = null
            } else if (!session.refreshToken) {
                // Only do idle test for web tokens
                const idleIn = (session.idleAt?.getTime() || now) - now
                if (idleIn >= 0 && idleIn < DEFAULT_WEB_SESSION_IDLE_GRACE) {
                    session.idleAt = Date.now() + DEFAULT_WEB_SESSION_IDLE_TIMEOUT
                    await session.save()
                } else if (idleIn < 0) {
                    // idled out
                    await session.destroy()
                    session = null
                }
            }
        }
        return session
    }
}
