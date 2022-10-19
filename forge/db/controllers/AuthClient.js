const { generateToken, compareHash } = require('../utils')

module.exports = {
    /**
     * Create a new auth client for the given project.
     * Note: the clientSecret is hashed before being stored in the database.
     *       The *only* opportunity to access the unhashed version is when it is
     *       returned by this function
     *
     */
    createClientForProject: async function (app, project) {
        const existingAuthClient = await project.getAuthClient()
        if (existingAuthClient) {
            // TODO: are there sessions to expire as well?
            await existingAuthClient.destroy()
        }

        const client = {
            clientID: generateToken(32, 'ffp'),
            clientSecret: generateToken(48)
        }
        await project.createAuthClient(client)
        return client
    },

    getAuthClient: async function (app, clientID, clientSecret) {
        const client = await app.db.models.AuthClient.findOne({
            where: { clientID }
        })
        if (client) {
            if (!clientSecret || compareHash(clientSecret, client.clientSecret)) {
                return client
            }
            return null
        }
        return null
    }

}
