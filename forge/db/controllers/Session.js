const { generateToken } = require('../utils')

const DEFAULT_WEB_SESSION_EXPIRY = 1000 * 60 * 60 * 24 // One day session
const DEFAULT_TOKEN_SESSION_EXPIRY = 1000 * 60 * 30 // 30 mins session - with refresh token support

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
                UserId: user.id
            })
        }
        return null
    },

    /**
     * Create a new oauth session for the given username
     */
    createTokenSession: async function (app, username) {
        const user = await app.db.models.User.byUsernameOrEmail(username)
        if (user) {
            const session = {
                sid: generateToken(32, 'ffp'),
                refreshToken: generateToken(32, 'ffp'),
                expiresAt: Date.now() + DEFAULT_TOKEN_SESSION_EXPIRY,
                UserId: user.id
            }
            // Do this in two stages as `refreshToken` is hashed in the db
            await app.db.models.Session.create(session)
            return session
        }
        return null
    },

    refreshTokenSession: async function (app, refreshToken) {
        const existingSession = await app.db.models.Session.byRefreshToken(refreshToken)
        if (existingSession) {
            const newSession = {
                sid: generateToken(32, 'ffp'),
                refreshToken: generateToken(32, 'ffp'),
                expiresAt: Date.now() + DEFAULT_TOKEN_SESSION_EXPIRY
            }
            await app.db.models.Session.update(newSession, { where: { refreshToken: existingSession.refreshToken } })
            return newSession
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
        if (session) {
            if (session.expiresAt.getTime() < Date.now()) {
                if (!session.refreshToken) {
                    // A web login session that can be removed
                    await session.destroy()
                }
                session = null
            }
        }
        return session
    }
}
