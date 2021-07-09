/**
 * Instances api routes
 * 
 *   /api/v1/project
 * 
 * @namespace projects
 * @memberof forge.route.api
 */

const { Op } = require("sequelize");
module.exports = async function(app) {
    /**
     * Get the details of a givevn project
     * @name /api/v1/project
     * @static
     * @memberof forge.routes.api.project
     */
    app.get('/', async (request, reply) => {
        let projects = []
        try {
            //need to work out how to filter by user, nearly there
            // prokects = await app.db.models.Project.findAll({
            //     include: {
            //         model: app.db.models.ProjectTeam,
            //         include: {
            //             model: app.db.models.Team,
            //             include: {
            //                 model: app.db.models.TeamMember,
            //                 where: {
            //                     UserId: request.session.User.id
            //                 }
            //             }
            //         }
            //     }
            // })
            projects = await app.db.models.User.findOne({
                where:{
                    username: request.session.User.email
                },
                include: {
                    model: app.db.models.Team
                }
            })
        } catch(err) {
            console.log(err)
        }
        reply.send(projects)
    })
}