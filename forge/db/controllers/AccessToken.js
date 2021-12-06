const { generateToken, compareHash } = require("../utils");


module.exports = {
    /**
     * Create a new auth client for the given project.
     * Note: the clientSecret is hashed before being stored in the database.
     *       The *only* opportunity to access the unhashed version is when it is
     *       returned by this function
     *
     */
    createTokenForProject: async function(app, project, expiresAt, scope) {
        return await app.db.models.AccessToken.create({
            token: generateToken(32,'fft'),
            expiresAt,
            scope,
            ownerId: project.id,
            ownerType: "project",
        })
    },
    /**
     * Get a token by its id. If the session has expired, it is deleted
     * and nothing returned.
     */
    getOrExpire: async function(app, token) {
        let accessToken = await app.db.models.AccessToken.findOne({
            where:{token}
        });
        if (accessToken) {
            if (accessToken.expiresAt && accessToken.expiresAt.getTime() < Date.now()) {
                await accessToken.destroy();
                accessToken = null;
            }
        }
        return accessToken
    }
}
