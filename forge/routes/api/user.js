/**
 * User api routes
 *
 * - /api/v1/user
 *
 * @namespace user
 * @memberof forge.routes.api
 */
module.exports = async function(app) {

    /**
     * Get the profile of the current logged in user
     * @name /api/v1/user
     * @static
     * @memberof forge.routes.api.user
     */
    app.get('/', async (request, reply) => {
        const users = await app.db.views.User.userProfile(request.session.User);
        reply.send(users)
    })

    /**
     * Update the current user's password
     * @name /api/v1/user/change_password
     * @static
     * @memberof forge.routes.api.user
     */
    app.post('/change_password', {
        schema: {
            body: {
                type: 'object',
                required: ['old_password', 'password'],
                properties: {
                    old_password: { type: 'string' },
                    password: { type: 'string' }
                }
            }
        }
    }, async(request, reply) => {
        try {
            await app.db.controllers.User.changePassword(request.session.User, request.body.old_password, request.body.password);
            reply.send({status:"okay"})
        } catch(err) {
            reply.code(400).send({error: "password change failed"})
        }
    });
}
