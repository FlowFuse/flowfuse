const sharedUser = require("./shared/users")
const UserInvitations = require("./userInvitations");

/**
 * User api routes
 *
 * - /api/v1/user
 *
 * These routes all operate in the context of the logged-in user
 * req.session.User
 *
 * @namespace user
 * @memberof forge.routes.api
 */
module.exports = async function(app) {

    app.register(UserInvitations, { prefix: "/invitations" })


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
    app.put('/change_password', {
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

    /**
     * Get the teams of the current logged in user
     * @name /api/v1/user/teams
     * @static
     * @memberof forge.routes.api.user
     */
    app.get('/teams', async (request, reply) => {
        const teams = await app.db.models.Team.forUser(request.session.User);
        const result = await app.db.views.Team.userTeamList(teams);
        reply.send({
            count: result.length,
            teams:result
        })
    })

    /**
     * Get the projects of the current logged in user
     * @name /api/v1/user/projects
     * @static
     * @memberof forge.routes.api.user
     */
    app.get('/projects', async (request, reply) => {
        const projects = await app.db.models.Project.byUser(request.session.User);
        const result = await app.db.views.Project.userProjectList(projects);
        reply.send({
            count: result.length,
            projects:result
        })
    })

    /**
     * Update user settings
     * @name /api/v1/user/
     * @static
     * @memberof forge.routes.api.user
     */
    app.put('/', async (request, reply) => {
        sharedUser.updateUser(app, request.session.User, request, reply);
    })
}
