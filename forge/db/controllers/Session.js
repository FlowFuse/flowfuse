const crypto = require('crypto');

const DEFAULT_SESSION_EXPIRY = 1000*60*60*24*7; // One week session

/**
 * Generate a Session ID. This is 32 bytes of random hex
 */
async function generateSessionId() {
    return new Promise((resolve,reject) => {
        crypto.randomBytes(32, function(err, buffer) {
            if (err) {
                return reject (err)
            }
            resolve(buffer.toString('hex'))
        });
    })
}

module.exports = {
    /**
     * Create a new session for the given username
     */
    createSession: async function(db, username) {
        const user = await db.models.User.findOne({
            where: { email: username },
        })
        if (user) {
            return db.models.Session.create({
                sid: await generateSessionId(),
                expiresAt: Date.now() +  DEFAULT_SESSION_EXPIRY,
                UserId: user.id
            })
        }
        return null
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
                await session.destroy();
                session = null;
            }
        }
        return session
    }
}
