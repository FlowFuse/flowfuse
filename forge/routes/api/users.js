/**
 * Users api routes
 *
 * - /api/v1/users
 *
 * @namespace users
 * @memberof forge.routes.api
 */
module.exports = async function(app) {

    // Lets assume all apis that access bulk users are admin only.
    app.addHook('preHandler',app.verifyAdmin);

    /**
     * Get a list of all known users
     * @name /api/v1/users
     * @static
     * @memberof forge.routes.api.users
     */
    app.get('/', async (request, reply) => {
        // TODO: pagniation support
        const users = await app.db.models.User.findAll();
        const result = [];
        for (let u of users) {
            result.push(await app.db.views.User.userProfile(u))
        }
        reply.send({
            count: result.length,
            users:result
        })
    })
}
