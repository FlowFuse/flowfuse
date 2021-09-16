const { generateToken } = require("../utils");


const DEFAULT_SESSION_EXPIRY = 1000*60*60*24*7; // One week session


module.exports = {
    /**
     * Create a new session for the given username
     */
    createUserSession: async function(db, username) {
        const user = await db.models.User.findOne({
            where: { email: username },
        })
        if (user) {
            return db.models.Session.create({
                sid: generateToken(32,'ffu'),
                expiresAt: Date.now() +  DEFAULT_SESSION_EXPIRY,
                UserId: user.id
            })
        }
        return null
    },

    /**
     * Create a new oauth session for the given username
     */
    createTokenSession: async function(db, username) {
        const user = await db.models.User.findOne({
            where: { email: username },
        })
        if (user) {
            const session = {
                sid: generateToken(32,'ffp'),
                refreshToken: generateToken(32,'ffp'),
                expiresAt: Date.now() +  10000, //DEFAULT_SESSION_EXPIRY,
                UserId: user.id
            }
            // Do this in two stages as `refreshToken` is hashed in the db
            await db.models.Session.create(session);
            return session;
        }
        return null
    },

    refreshTokenSession: async function(db, refresh_token) {
        const existingSession = await db.models.Session.byRefreshToken( refresh_token );
        if (existingSession) {
            const newSession = {
                sid: generateToken(32,'ffp'),
                refreshToken: generateToken(32,'ffp'),
                expiresAt: Date.now() + 10000 // DEFAULT_SESSION_EXPIRY,
            }
            await db.models.Session.update(newSession, { where: { refreshToken: existingSession.refreshToken } });
            return newSession;
        }
        return null;
    },

    /**
     * Delete a session
     */
    deleteSession: async function(db, sid) {
        return db.models.Session.destroy({where: {sid}})
    },

    /**
     * Get a session by its id. If the session has expired, it is deleted
     * and nothing returned.
     */
    getOrExpire: async function(db, sid) {
        let session = await db.models.Session.findOne({
            where:{sid},
            include: db.models.User
        });
        if (session) {
            if (session.expiresAt.getTime() < Date.now()) {
                if (!session.refreshToken) {
                    // A web login session that can be removed
                    await session.destroy();
                }
                session = null;
            }
        }
        return session
    }
}
