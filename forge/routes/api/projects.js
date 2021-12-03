/**
 * Instances api routes
 *
 *   /api/v1/projects
 *
 * @namespace projects
 * @memberof forge.route.api
 */

const { Op } = require("sequelize");
module.exports = async function(app) {
    /**
     * Get the details of a given project
     * @name /api/v1/project
     * @static
     * @memberof forge.routes.api.project
     */
    app.get('/', async (request, reply) => {

        // TODO: I don't think this is used anywhere and should be removed

        let projects = []
        try {
            projects = await app.db.models.Project.byUser(request.session.User)
        } catch(err) {
            console.log(err)
        }
        reply.send(projects)
    })
}
