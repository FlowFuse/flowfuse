/**
 * Instances api routes
 * 
 *   /api/v1/instance
 * 
 * @namespace instances
 * @memberof forge.route.api
 */
module.exports = async function(app) {
    /**
     * Get the details of a givevn instance
     * @name /api/v1/instance
     * @static
     * @memberof forge.routes.api.instance
     */
    app.get('/', async (request, reply) => {
        let instances = []
        try {
            //need to work out how to filter by user, nearly there
            instances = await app.db.models.Instance.findAll({
                include: {
                    model: app.db.models.InstanceTeam,
                    include: {
                        model: app.db.models.Team,
                        include: {
                            model: app.db.models.TeamMember,
                            where: {
                                UserId: request.session.User.id
                            }
                        }
                    }
                }
            })
        } catch(err) {
            console.log(err)
        }
        reply.send(instances)
    })
}