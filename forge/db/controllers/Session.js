const {
    DEFAULT_WEB_SESSION_EXPIRY,
    DEFAULT_WEB_SESSION_IDLE_GRACE,
    DEFAULT_WEB_SESSION_IDLE_TIMEOUT,
    HOUR
} = require('../../lib/auth')
const { generateToken } = require('../utils')

module.exports = {
    /**
     * Create a new session for the given username
     */
    createUserSession: async function (app, username, expiry, idle) {
        const user = await app.db.models.User.byUsernameOrEmail(username)
        if (user && !user.suspended) {
            const expirySeconds = expiry ? (expiry * HOUR) : undefined
            const idleSeconds = idle ? (idle * HOUR) : undefined
            const session = await app.db.models.Session.create({
                sid: generateToken(32, 'ffu'),
                expiresAt: Date.now() + (expirySeconds || app.config.sessions?.maxDuration || DEFAULT_WEB_SESSION_EXPIRY),
                idleAt: Date.now() + (idleSeconds || (app.config.sessions?.maxIdleDuration ? app.config.sessions?.maxIdleDuration * 0.9 : DEFAULT_WEB_SESSION_IDLE_TIMEOUT)),
                UserId: user.id,
                mfa_verified: false
            })
            session.User = user
            return session
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
     * Delete all sessions for a user
     */
    deleteAllUserSessions: async function (app, user) {
        return app.db.models.Session.destroy({ where: { UserId: user.id } })
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
