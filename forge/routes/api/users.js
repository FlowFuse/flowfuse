const sharedUser = require("./shared/users")
const { Roles, RoleNames } = require("../../lib/roles.js")

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
        const paginationOptions = app.getPaginationOptions(request)
        const users = await app.db.models.User.getAll(paginationOptions);
        users.users = users.users.map(u => app.db.views.User.userProfile(u))
        reply.send(users);
    })

    /**
     * Get a user's settings
     * @name /api/v1/users/:id
     * @static
     * @memberof forge.routes.api.users
     */
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
            sharedUser.updateUser(app, user, request, reply);
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })

    /**
     * Create a new user
     */
    app.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['name','username','password'],
                properties: {
                    name: { type: 'string' },
                    username: { type: 'string' },
                    password: { type: 'string' },
                    isAdmin: { type: 'boolean' },
                    createDefaultTeam: { type: 'boolean' }
                }
            }
        }
    }, async (request, reply) => {
        if (/^(admin|root)$/.test(request.body.username)) {
            reply.code(400).send({error:"invalid username"});
            return
        }
        try {
            const newUser = await app.db.models.User.create({
                username: request.body.username,
                name: request.body.name,
                email: request.body.email,
                password: request.body.password,
                admin: !!request.body.isAdmin,
            });

            if (request.body.createDefaultTeam) {
                const newTeam = await app.db.models.Team.create({
                    name: `Team ${request.body.name}`,
                    slug: request.body.username
                });
                await newTeam.addUser(newUser, { through: { role:Roles.Owner } });
            }
            reply.send({status: "okay"})
        } catch(err) {
            let responseMessage;
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(",");
            } else {
                responseMessage = err.toString();
            }
            reply.code(400).send({error:responseMessage})
        }
    });
}
