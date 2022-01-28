const { generateToken, sha256 } = require('../utils')

module.exports = {
    /**
     * Create a new auth client for the given project.
     * The token is hashed in the database. The only time the
     * true value is available is when it is returned from this function.
     */
    createTokenForProject: async function (app, project, expiresAt, scope) {
        const existingProjectToken = await project.getAccessToken()
        if (existingProjectToken) {
            await existingProjectToken.destroy()
        }
        const token = generateToken(32, 'fft')
        await app.db.models.AccessToken.create({
            token,
            expiresAt,
            scope,
            ownerId: project.id,
            ownerType: 'project'
        })
        return { token }
    },
    /**
     * Get a token by its id. If the session has expired, it is deleted
     * and nothing returned.
     */
    getOrExpire: async function (app, token) {
        let accessToken = await app.db.models.AccessToken.findOne({
            where: { token: sha256(token) }
        })
        if (accessToken) {
            if (accessToken.expiresAt && accessToken.expiresAt.getTime() < Date.now()) {
                await accessToken.destroy()
                accessToken = null
            }
        }
        return accessToken
    }
}
