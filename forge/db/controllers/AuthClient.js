const { generateToken, compareHash } = require("../utils");


module.exports = {
    /**
     * Create a new auth client for the given project.
     * Note: the clientSecret is hashed before being stored in the database.
     *       The *only* opportunity to access the unhashed version is when it is
     *       returned by this function
     *
     */
    createClientForProject: async function(app, project) {

        // TODO: what if the project already has one
        const client = {
            clientID: generateToken(32,'ffp'),
            clientSecret: generateToken(48)
        }
        const authClient = await project.createAuthClient(client);
        return client;
    },

    getAuthClient: async function(app, clientID, clientSecret) {
        const client = await app.db.models.AuthClient.findOne({
            where: { clientID: clientID }
        })
        if (client) {
            if (!clientSecret || compareHash(clientSecret, client.clientSecret)) {
                return client
            }
            return null;
        }
        return null;
    },

}
