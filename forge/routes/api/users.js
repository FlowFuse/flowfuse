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
            result.push(app.db.views.User.userProfile(u))
        }
        reply.send({
            count: result.length,
            users:result
        })
    })

    app.get('/:id', async (request, reply) => {
        const user = await app.db.models.User.byId(request.params.id)
        if (user) {
            reply.send(app.db.views.User.userProfile(user))
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })

    /**
     * Update user settings
     * @name /api/v1/users/:id
     * @static
     * @memberof forge.routes.api.users
     */
    app.put('/:id', async (request, reply) => {
        const user = await app.db.models.User.byId(request.params.id)
        if (user) {
            try {
                if (request.body.name) {
                    user.name = request.body.name;
                } else if (request.body.name === "") {
                    user.name = request.body.username || user.username;
                }
                if (request.body.email) {
                    user.email = request.body.email;
                }
                if (request.body.username) {
                    user.username = request.body.username;
                }
                if (request.body.hasOwnProperty('admin')) {
                    user.admin = request.body.admin;
                }
                await user.save();
                reply.send(app.db.views.User.userProfile(user))
            } catch(err) {
                let responseMessage;
                if (err.errors) {
                    responseMessage = err.errors.map(err => err.message).join(",");
                } else {
                    responseMessage = err.toString();
                }
                console.log(err.toString())
                console.log(responseMessage)
                reply.code(400).send({error:responseMessage})
            }
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })
}
